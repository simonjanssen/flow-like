use super::App;
use crate::state::FlowLikeState;
use flow_like_types::{tokio::{self, task}, Bytes};
use flow_like_storage::{blake3, object_store::{ObjectStore, PutPayload}, Path};
use flow_like_types::{anyhow, sync::Mutex};
use futures::{StreamExt, TryStreamExt};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, io::Write, path::PathBuf, sync::Arc, time::SystemTime};
use zip::{ZipArchive, ZipWriter};
use argon2::{Argon2, Algorithm, Params, Version};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, JsonSchema, PartialEq, Eq)]
pub enum StoreKind {
    Meta,
    Storage,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ManifestEntry {
    pub store: StoreKind,
    pub rel_path: String,
    pub size: u64,
    pub blake3: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ExportManifest {
    pub version: u32,
    pub app_id: String,
    pub created_at: u64,
    pub files: HashMap<String, ManifestEntry>,
}

const ENC_MAGIC: &[u8] = b"FLOWAPP_CHACHA2";
const SALT_LEN: usize = 16;
const XNONCE_LEN: usize = 24;

const ARGON2_M_COST_KIB: u32 = 64 * 1024;
const ARGON2_T_COST: u32 = 3;
const ARGON2_P_COST: u32 = 1;

fn blake3_hash(data: &[u8]) -> String {
    blake3::hash(data).to_hex().to_string()
}

enum ZipWriteCmd {
    File { name: String, data: Vec<u8> },
    Done,
}

fn zip_write_streaming(
    target: PathBuf,
    rx: std::sync::mpsc::Receiver<ZipWriteCmd>,
) -> flow_like_types::Result<()> {
    let mut file = std::fs::File::create(&target)?;
    let mut zw = ZipWriter::new(&mut file);
    let opts = zip::write::FileOptions::<zip::write::ExtendedFileOptions>::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .large_file(true);

    while let Ok(cmd) = rx.recv() {
        match cmd {
            ZipWriteCmd::File { name, data } => {
                zw.start_file(name, opts.clone())?;
                zw.write_all(&data)?;
            }
            ZipWriteCmd::Done => {
                break;
            }
        }
    }

    zw.finish()?;
    file.flush()?;
    Ok(())
}

async fn collect_store_files(
    store: Arc<dyn ObjectStore>,
    root: &Path,
) -> flow_like_types::Result<Vec<(Path, u64)>> {
    let mut out = Vec::new();
    let mut stream = store.list(Some(root)).boxed();
    while let Some(item) = stream.try_next().await? {
        out.push((item.location, item.size as u64));
    }
    Ok(out)
}

async fn read_store_file_bytes(
    store: Arc<dyn ObjectStore>,
    path: &Path,
) -> flow_like_types::Result<Vec<u8>> {
    let obj = store.get(path).await?;
    let b = obj.bytes().await?;
    Ok(b.to_vec())
}

fn encrypt_bytes(password: &str, plain: &[u8]) -> flow_like_types::Result<Vec<u8>> {
    use chacha20poly1305::{aead::Aead, KeyInit, XChaCha20Poly1305, XNonce};
    use argon2::{Argon2, Algorithm, Params, Version};

    use flow_like_types::rand::{rng, Rng};

    let mut salt = [0u8; SALT_LEN];
    let mut nonce = [0u8; XNONCE_LEN];
    rng().fill(&mut salt);
    rng().fill(&mut nonce);

    let params = Params::new(ARGON2_M_COST_KIB, ARGON2_T_COST, ARGON2_P_COST, None)
        .map_err(|e| anyhow!(e.to_string()))?;
    let kdf = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    kdf.hash_password_into(password.as_bytes(), &salt, &mut key)
        .map_err(|e| anyhow!(e.to_string()))?;

    let cipher = XChaCha20Poly1305::new_from_slice(&key).map_err(|e| anyhow!(e))?;
    let ciphertext = cipher
        .encrypt(XNonce::from_slice(&nonce), plain)
        .map_err(|e| anyhow!(e))?;

    let mut out = Vec::with_capacity(ENC_MAGIC.len() + SALT_LEN + XNONCE_LEN + ciphertext.len());
    out.extend_from_slice(ENC_MAGIC);
    out.extend_from_slice(&salt);
    out.extend_from_slice(&nonce);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

fn decrypt_bytes(password: &str, data: &[u8]) -> flow_like_types::Result<Vec<u8>> {
    use chacha20poly1305::{aead::Aead, KeyInit, XChaCha20Poly1305, XNonce};

    if data.len() < ENC_MAGIC.len() + SALT_LEN + XNONCE_LEN {
        return Err(anyhow!("Invalid encrypted archive"));
    }
    let (magic, rest) = data.split_at(ENC_MAGIC.len());
    if magic != ENC_MAGIC {
        return Err(anyhow!("Invalid encrypted archive header"));
    }
    let (salt, rest) = rest.split_at(SALT_LEN);
    let (nonce, ciphertext) = rest.split_at(XNONCE_LEN);

    let params = Params::new(ARGON2_M_COST_KIB, ARGON2_T_COST, ARGON2_P_COST, None)
        .map_err(|e| anyhow!(e.to_string()))?;
    let kdf = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

    let mut key = [0u8; 32];
    kdf.hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| anyhow!(e.to_string()))?;

    let cipher = XChaCha20Poly1305::new_from_slice(&key).map_err(|e| anyhow!(e))?;
    let plain = cipher
        .decrypt(XNonce::from_slice(nonce), ciphertext)
        .map_err(|_| anyhow!("Decryption failed"))?;
    Ok(plain)
}

fn is_zip(data: &[u8]) -> bool {
    data.len() >= 4 && (&data[..4] == b"PK\x03\x04" || &data[..4] == b"PK\x05\x06" || &data[..4] == b"PK\x06\x06")
}

fn now_unix() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

impl App {
    // Exports all files under apps/{app_id} from meta and storage stores, with manifest and optional encryption.
    // Returns (archive_bytes, extension: ".flow-app" or ".sec.flow-app").
    pub async fn export_archive(
        &self,
        password: Option<&str>,
        mut target_file: PathBuf
    ) -> flow_like_types::Result<(Vec<u8>, &'static str)> {

        if password.is_some() && !target_file.to_string_lossy().ends_with(".sec.flow-app") {
            target_file.set_extension("sec.flow-app");
        } else if target_file.to_string_lossy().ends_with(".sec.flow-app") {
            target_file.set_extension("flow-app");
        }

        let app_state = self
            .app_state
            .clone()
            .ok_or(anyhow!("App state not found"))?;

        let meta = FlowLikeState::project_meta_store(&app_state)
            .await?
            .as_generic();
        let storage = FlowLikeState::project_storage_store(&app_state)
            .await?
            .as_generic();

        let base = Path::from("apps").child(self.id.clone());
        let meta_files = collect_store_files(meta.clone(), &base).await?;
        let storage_files = collect_store_files(storage.clone(), &base).await?;

        if let Some(parent) = target_file.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut manifest = ExportManifest {
            version: 1,
            app_id: self.id.clone(),
            created_at: now_unix(),
            files: HashMap::new(),
        };

        let base_str = base.to_string();
        let base_prefix = if base_str.ends_with('/') {
            base_str
        } else {
            format!("{}/", base_str)
        };

        let (tx, rx) = std::sync::mpsc::channel::<ZipWriteCmd>();
        let zip_path = target_file.with_extension("flow-app"); // produce unencrypted ZIP first
        let writer_handle = task::spawn_blocking({
            let zip_path = zip_path.clone();
            move || zip_write_streaming(zip_path, rx)
        });

        for (path, size) in meta_files {
            let full = path.to_string();
            let rel = full.strip_prefix(&base_prefix).unwrap_or(&full).to_string();
            let bytes = read_store_file_bytes(meta.clone(), &path).await?;
            let sha = blake3_hash(&bytes);

            tx.send(ZipWriteCmd::File {
                name: format!("meta/{}", rel),
                data: bytes,
            }).map_err(|e| anyhow!("ZIP writer channel closed: {}", e))?;

            manifest.files.insert(rel.clone(), ManifestEntry {
                store: StoreKind::Meta,
                rel_path: rel,
                size,
                blake3: sha,
            });
        }

        for (path, size) in storage_files {
            let full = path.to_string();
            let rel = full.strip_prefix(&base_prefix).unwrap_or(&full).to_string();
            let bytes = read_store_file_bytes(storage.clone(), &path).await?;
            let sha = blake3_hash(&bytes);

            tx.send(ZipWriteCmd::File {
                name: format!("storage/{}", rel),
                data: bytes,
            }).map_err(|e| anyhow!("ZIP writer channel closed: {}", e))?;

            manifest.files.insert(rel.clone(), ManifestEntry {
                store: StoreKind::Storage,
                rel_path: rel,
                size,
                blake3: sha,
            });
        }

        let manifest_bytes = flow_like_types::json::to_vec(&manifest)?;
        tx.send(ZipWriteCmd::File {
            name: "manifest.json".to_string(),
            data: manifest_bytes,
        }).map_err(|e| anyhow!("ZIP writer channel closed: {}", e))?;

        tx.send(ZipWriteCmd::Done).ok();
        writer_handle.await.map_err(|e| anyhow!("ZIP writer task failed: {}", e))??;

        if let Some(pw) = password {
            let plain_zip = tokio::fs::read(&zip_path).await?;
            let enc = encrypt_bytes(pw, &plain_zip)?;
            let mut enc_path = zip_path.clone();
            enc_path.set_extension("sec.flow-app");
            tokio::fs::write(&enc_path, &enc).await?;
            // Optionally remove the unencrypted archive
            let _ = tokio::fs::remove_file(&zip_path).await;
            Ok((enc, ".sec.flow-app"))
        } else {
            let zip_bytes = tokio::fs::read(&zip_path).await?;
            Ok((zip_bytes, ".flow-app"))
        }
    }

    pub async fn import_archive(
        app_state: Arc<Mutex<FlowLikeState>>,
        source_file: PathBuf,
        password: Option<&str>,
    ) -> flow_like_types::Result<Self> {
        let header = task::spawn_blocking({
            let source_file = source_file.clone();
            move || -> flow_like_types::Result<Vec<u8>> {
                let mut f = std::fs::File::open(&source_file)?;
                let mut buf = [0u8; 8];
                let n = std::io::Read::read(&mut f, &mut buf)?;
                Ok(buf[..n].to_vec())
            }
        }).await.map_err(|e| anyhow!("Header read task failed: {}", e))??;

        let plain_source: Option<Vec<u8>> = if is_zip(&header) {
            None
        } else if let Some(pw) = password {
            let data = tokio::fs::read(&source_file).await?;
            Some(decrypt_bytes(pw, &data)?)
        } else {
            return Err(anyhow!("Archive is encrypted; password required"));
        };

        let manifest: ExportManifest = if let Some(plain) = &plain_source {
            let manifest_bytes = task::spawn_blocking({
                let plain = plain.clone();
                move || -> flow_like_types::Result<Vec<u8>> {
                    let cursor = std::io::Cursor::new(plain);
                    let mut zip = ZipArchive::new(cursor)?;
                    let mut f = zip.by_name("manifest.json")
                        .map_err(|_| anyhow!("Missing manifest.json"))?;
                    let mut buf = Vec::with_capacity(f.size() as usize);
                    std::io::copy(&mut f, &mut buf)?;
                    Ok(buf)
                }
            }).await.map_err(|e| anyhow!("Manifest read task failed: {}", e))??;
            flow_like_types::json::from_slice(&manifest_bytes)?
        } else {
            let manifest_bytes = task::spawn_blocking({
                let source_file = source_file.clone();
                move || -> flow_like_types::Result<Vec<u8>> {
                    let mut f = std::fs::File::open(&source_file)?;
                    let mut zip = ZipArchive::new(&mut f)?;
                    let mut mf = zip.by_name("manifest.json")
                        .map_err(|_| anyhow!("Missing manifest.json"))?;
                    let mut buf = Vec::with_capacity(mf.size() as usize);
                    std::io::copy(&mut mf, &mut buf)?;
                    Ok(buf)
                }
            }).await.map_err(|e| anyhow!("Manifest read task failed: {}", e))??;
            flow_like_types::json::from_slice(&manifest_bytes)?
        };

        let meta = FlowLikeState::project_meta_store(&app_state)
            .await?
            .as_generic();
        let storage = FlowLikeState::project_storage_store(&app_state)
            .await?
            .as_generic();

        let base = Path::from("apps").child(manifest.app_id.clone());

        enum ImportItem {
            File { store: StoreKind, rel: String, data: Vec<u8> },
            End,
        }
        let (tx, rx) = std::sync::mpsc::channel::<ImportItem>();

        if let Some(plain) = plain_source {
            let manifest_files = manifest.files.clone();
            task::spawn_blocking(move || -> flow_like_types::Result<()> {
                let cursor = std::io::Cursor::new(plain);
                let mut zip = ZipArchive::new(cursor)?;
                for entry in manifest_files.values() {
                    let prefix = match entry.store {
                        StoreKind::Meta => "meta/",
                        StoreKind::Storage => "storage/",
                    };
                    let name = format!("{}{}", prefix, entry.rel_path);
                    let mut f = zip.by_name(&name)
                        .map_err(|_| anyhow!("Missing file in archive: {}", name))?;
                    let mut buf = Vec::with_capacity(f.size() as usize);
                    std::io::copy(&mut f, &mut buf)?;
                    tx.send(ImportItem::File { store: entry.store, rel: entry.rel_path.clone(), data: buf }).map_err(|e| anyhow!(e.to_string()))?;
                }
                tx.send(ImportItem::End).ok();
                Ok(())
            }).await.map_err(|e| anyhow!("ZIP reader task failed: {}", e))??;
        } else {
            let source_file_cloned = source_file.clone();
            let manifest_files = manifest.files.clone();
            task::spawn_blocking(move || -> flow_like_types::Result<()> {
                let mut file = std::fs::File::open(&source_file_cloned)?;
                let mut zip = ZipArchive::new(&mut file)?;
                for entry in manifest_files.values() {
                    let prefix = match entry.store {
                        StoreKind::Meta => "meta/",
                        StoreKind::Storage => "storage/",
                    };
                    let name = format!("{}{}", prefix, entry.rel_path);
                    let mut f = zip.by_name(&name)
                        .map_err(|_| anyhow!("Missing file in archive: {}", name))?;
                    let mut buf = Vec::with_capacity(f.size() as usize);
                    std::io::copy(&mut f, &mut buf)?;
                    tx.send(ImportItem::File { store: entry.store, rel: entry.rel_path.clone(), data: buf }).map_err(|e| anyhow!(e.to_string()))?;
                }
                tx.send(ImportItem::End).ok();
                Ok(())
            }).await.map_err(|e| anyhow!("ZIP reader task failed: {}", e))??;
        }

        for item in rx {
            match item {
                ImportItem::File { store, rel, data } => {
                    let target_path = base.child(rel.clone());
                    // Verify hash against manifest entry
                    let expected = manifest.files.get(&rel)
                        .ok_or_else(|| anyhow!("Manifest entry missing for {}", rel))?;
                    if blake3_hash(&data) != expected.blake3 {
                        return Err(anyhow!("Hash mismatch for {}", rel));
                    }
                    let s = match store {
                        StoreKind::Meta => &meta,
                        StoreKind::Storage => &storage,
                    };
                    let payload = PutPayload::from_bytes(Bytes::from(data));
                    s.put(&target_path, payload).await?;
                }
                ImportItem::End => break,
            }
        }

        let mut app = App::load(manifest.app_id.clone(), app_state.clone()).await?;
        app.updated_at = SystemTime::now();
        app.save().await?;

        Ok(app)
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs::File, io::Read};
    use tempfile::NamedTempFile;

    // ---------- Encryption tests ----------

    #[test]
    fn encrypt_then_decrypt_roundtrip() {
        let pw = "s3cret!";
        let plain = b"hello flow-like";

        let enc = encrypt_bytes(pw, plain).expect("encrypt");
        assert_ne!(enc, plain, "ciphertext must differ from plaintext");
        assert!(
            enc.starts_with(ENC_MAGIC),
            "ciphertext must start with ENC_MAGIC"
        );

        // Structure: MAGIC + salt + nonce + ciphertext
        assert!(
            enc.len() > ENC_MAGIC.len() + SALT_LEN + XNONCE_LEN,
            "has room for ciphertext"
        );

        // Different encryptions should be different (random salt/nonce)
        let enc2 = encrypt_bytes(pw, plain).expect("encrypt");
        assert_ne!(enc, enc2, "randomized encryption should differ per call");

        let dec = decrypt_bytes(pw, &enc).expect("decrypt");
        assert_eq!(dec, plain);
    }

    #[test]
    fn decrypt_with_wrong_password_fails() {
        let enc = encrypt_bytes("pw1", b"top secret").expect("encrypt");
        let err = decrypt_bytes("pw2", &enc).unwrap_err();
        let msg = format!("{err:#}");
        assert!(
            msg.to_lowercase().contains("decrypt") || msg.to_lowercase().contains("failed"),
            "expected decrypt error, got: {msg}"
        );
    }

    #[test]
    fn decrypt_with_wrong_magic_fails() {
        let pw = "pw";
        let mut bad = encrypt_bytes(pw, b"abc").expect("encrypt");
        // Corrupt the magic
        bad[0] ^= 0xFF;
        let err = decrypt_bytes(pw, &bad).unwrap_err();
        let msg = format!("{err:#}");
        assert!(
            msg.to_lowercase().contains("invalid encrypted archive header"),
            "expected header error, got: {msg}"
        );
    }

    #[test]
    fn encryption_output_is_not_zip() {
        let pw = "pw";
        let enc = encrypt_bytes(pw, b"some payload").expect("encrypt");
        assert!(!is_zip(&enc), "encrypted blob must not be detected as zip");
    }

    // ---------- ZIP writer tests ----------

    #[test]
    fn zip_write_streaming_writes_files_and_content() {
        // Prepare a temp target
        let tmp = NamedTempFile::new().expect("tmp");
        let target_path = tmp.path().to_path_buf();

        let (tx, rx) = std::sync::mpsc::channel::<ZipWriteCmd>();

        // Write in a blocking helper thread (as production code does)
        let handle = std::thread::spawn(move || zip_write_streaming(target_path, rx));

        // Send two small files and finish
        tx.send(ZipWriteCmd::File {
            name: "dir/one.txt".to_string(),
            data: b"first".to_vec(),
        })
        .unwrap();
        tx.send(ZipWriteCmd::File {
            name: "two.bin".to_string(),
            data: vec![1, 2, 3, 4, 5],
        })
        .unwrap();
        tx.send(ZipWriteCmd::Done).unwrap();

        handle.join().expect("join").expect("zip write ok");

        // Re-open the written zip and verify contents
        let mut f = File::open(tmp.path()).expect("open zip");
        let mut zip = ZipArchive::new(&mut f).expect("read zip");

        // dir/one.txt
        {
            let mut file = zip.by_name("dir/one.txt").expect("missing one.txt");
            assert_eq!(file.name(), "dir/one.txt");
            let mut buf = String::new();
            file.read_to_string(&mut buf).expect("read one.txt");
            assert_eq!(buf, "first");
        }

        // two.bin
        {
            let mut file = zip.by_name("two.bin").expect("missing two.bin");
            assert_eq!(file.name(), "two.bin");
            let mut buf = Vec::new();
            file.read_to_end(&mut buf).expect("read two.bin");
            assert_eq!(buf, vec![1, 2, 3, 4, 5]);
        }
    }

    #[test]
    fn is_zip_detects_zip_headers() {
        // Minimal PK header detection test using a real tiny zip written by the same helper
        let tmp = NamedTempFile::new().expect("tmp");
        let (tx, rx) = std::sync::mpsc::channel::<ZipWriteCmd>();
        let path = tmp.path().to_path_buf();
        let h = std::thread::spawn(move || zip_write_streaming(path, rx));
        tx.send(ZipWriteCmd::File {
            name: "x".into(),
            data: b"y".to_vec(),
        })
        .unwrap();
        tx.send(ZipWriteCmd::Done).unwrap();
        h.join().unwrap().unwrap();

        // Read first 8 bytes and call is_zip
        let header = {
            let mut f = File::open(tmp.path()).unwrap();
            let mut buf = [0u8; 8];
            let n = f.read(&mut buf).unwrap();
            buf[..n].to_vec()
        };
        assert!(is_zip(&header), "should detect PK header");
    }

        #[test]
    fn zip_encrypt_decrypt_roundtrip_integrated() {
        use std::{fs::File, io::{Read, Cursor}};
        use tempfile::NamedTempFile;

        // 1) Build a tiny ZIP via the streaming writer
        let tmp = NamedTempFile::new().expect("tmp");
        let target_path = tmp.path().to_path_buf();
        let (tx, rx) = std::sync::mpsc::channel::<ZipWriteCmd>();
        let writer = std::thread::spawn(move || zip_write_streaming(target_path, rx));

        tx.send(ZipWriteCmd::File {
            name: "dir/one.txt".into(),
            data: b"first".to_vec(),
        }).unwrap();
        tx.send(ZipWriteCmd::File {
            name: "two.bin".into(),
            data: vec![1,2,3,4,5],
        }).unwrap();
        tx.send(ZipWriteCmd::Done).unwrap();

        writer.join().unwrap().expect("zip write ok");

        // Read the produced ZIP bytes
        let mut f = File::open(tmp.path()).expect("open zip");
        let mut zip_bytes = Vec::new();
        f.read_to_end(&mut zip_bytes).expect("read zip");
        assert!(is_zip(&zip_bytes), "freshly-written bytes should be a ZIP");

        // 2) Encrypt the ZIP and ensure it is not mistaken as ZIP
        let pw = "sup3r-secret";
        let enc = encrypt_bytes(pw, &zip_bytes).expect("encrypt");
        assert!(!is_zip(&enc), "encrypted blob must not be detected as ZIP");
        assert!(enc.starts_with(ENC_MAGIC), "encrypted blob must start with magic");

        // 3) Decrypt and check exact byte-for-byte equality
        let dec = decrypt_bytes(pw, &enc).expect("decrypt");
        assert_eq!(dec, zip_bytes, "decrypt must restore original ZIP bytes");
        assert!(is_zip(&dec), "decrypted bytes must be a ZIP again");

        // 4) Open decrypted ZIP and verify contents
        let cursor = Cursor::new(dec);
        let mut zip = ZipArchive::new(cursor).expect("valid zip after decrypt");

        // dir/one.txt
        {
            let mut file = zip.by_name("dir/one.txt").expect("one.txt present");
            let mut buf = String::new();
            use std::io::Read as _;
            file.read_to_string(&mut buf).expect("read one.txt");
            assert_eq!(buf, "first");
        }

        // two.bin
        {
            let mut file = zip.by_name("two.bin").expect("two.bin present");
            let mut buf = Vec::new();
            use std::io::Read as _;
            file.read_to_end(&mut buf).expect("read two.bin");
            assert_eq!(buf, vec![1,2,3,4,5]);
        }
    }

     #[test]
    fn zip_encrypt_decrypt_big_file() {
        use std::{fs::File, io::{Read, Cursor}};
        use tempfile::NamedTempFile;
        use flow_like_types::rand::{RngCore, rngs::StdRng, SeedableRng};

        // 1) Create a 100MB pseudo-random file in memory
        let mut big_data = vec![0u8; 100 * 1024 * 1024];
        let mut rng = StdRng::seed_from_u64(42); // deterministic
        rng.fill_bytes(&mut big_data);

        // 2) Stream ZIP write
        let tmp = NamedTempFile::new().expect("tmp");
        let target_path = tmp.path().to_path_buf();
        let (tx, rx) = std::sync::mpsc::channel::<ZipWriteCmd>();
        let writer = std::thread::spawn(move || zip_write_streaming(target_path, rx));

        tx.send(ZipWriteCmd::File {
            name: "big.bin".into(),
            data: big_data.clone(),
        }).unwrap();
        tx.send(ZipWriteCmd::Done).unwrap();
        writer.join().unwrap().expect("zip write ok");

        // 3) Encrypt & decrypt
        let mut zip_bytes = Vec::new();
        File::open(tmp.path()).unwrap().read_to_end(&mut zip_bytes).unwrap();
        let pw = "bigpass";
        let enc = encrypt_bytes(pw, &zip_bytes).expect("encrypt");
        let dec = decrypt_bytes(pw, &enc).expect("decrypt");
        assert_eq!(zip_bytes, dec);

        // 4) Verify ZIP content
        let mut zip = ZipArchive::new(Cursor::new(dec)).expect("valid zip");
        let mut file = zip.by_name("big.bin").expect("missing big.bin");
        let mut extracted = Vec::new();
        file.read_to_end(&mut extracted).unwrap();
        assert_eq!(extracted, big_data);
    }
}