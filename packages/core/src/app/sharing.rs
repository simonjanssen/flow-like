use super::App;
use crate::state::FlowLikeState;
use flow_like_types::Bytes;
use flow_like_storage::{blake3, files::store::FlowLikeStore, object_store::{ObjectStore, PutPayload}, Path};
use flow_like_types::{anyhow, sync::Mutex};
use futures::{StreamExt, TryStreamExt};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, io::Write, path::PathBuf, sync::Arc, time::SystemTime};
use zip::{write::FileOptions, ZipArchive, ZipWriter};

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
    pub files: Vec<ManifestEntry>,
}

const ENC_MAGIC: &[u8] = b"FLOWAPP_CHACHA1";
const PBKDF2_ITERATIONS: u32 = 200_000;
const SALT_LEN: usize = 16;
const XNONCE_LEN: usize = 24;

fn blake3_hash(data: &[u8]) -> String {
    blake3::hash(data).to_hex().to_string()
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

fn zip_write_file(
    zw: &mut ZipWriter<std::io::Cursor<Vec<u8>>>,
    path_in_zip: &str,
    data: &[u8],
) -> flow_like_types::Result<()> {
     let opts = zip::write::FileOptions::<zip::write::ExtendedFileOptions>::default()
        .compression_method(zip::CompressionMethod::Deflated);
    zw.start_file(path_in_zip, opts)?;
    zw.write_all(data)?;
    Ok(())
}

fn zip_finish(zw: ZipWriter<std::io::Cursor<Vec<u8>>>) -> flow_like_types::Result<std::io::Cursor<Vec<u8>>> {
    Ok(zw.finish()?)
}

// XChaCha20-Poly1305 with PBKDF2-HMAC-SHA256 derived 256-bit key
fn encrypt_bytes(password: &str, plain: &[u8]) -> flow_like_types::Result<Vec<u8>> {
    use chacha20poly1305::{aead::Aead, KeyInit, XChaCha20Poly1305, XNonce};
    use pbkdf2::pbkdf2_hmac;

    use flow_like_types::rand::{rng, Rng};

    let mut salt = [0u8; SALT_LEN];
    let mut nonce = [0u8; XNONCE_LEN];
    rng().fill(&mut salt);
    rng().fill(&mut nonce);

    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), &salt, PBKDF2_ITERATIONS, &mut key);

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
    use pbkdf2::pbkdf2_hmac;

    if data.len() < ENC_MAGIC.len() + SALT_LEN + XNONCE_LEN {
        return Err(anyhow!("Invalid encrypted archive"));
    }
    let (magic, rest) = data.split_at(ENC_MAGIC.len());
    if magic != ENC_MAGIC {
        return Err(anyhow!("Invalid encrypted archive header"));
    }
    let (salt, rest) = rest.split_at(SALT_LEN);
    let (nonce, ciphertext) = rest.split_at(XNONCE_LEN);

    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
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

        let mut file_cursor = std::io::Cursor::new(Vec::new());
        if let Some(parent) = target_file.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = std::fs::File::create(&target_file)?;
        file_cursor.set_position(0);
        file_cursor.get_mut().clear();

        let mut zw = ZipWriter::new(file_cursor);
        let mut manifest = ExportManifest {
            version: 1,
            app_id: self.id.clone(),
            created_at: now_unix(),
            files: Vec::new(),
        };

        let base_str = base.to_string();
        let base_prefix = if base_str.ends_with('/') {
            base_str
        } else {
            format!("{}/", base_str)
        };

        for (path, size) in meta_files {
            let full = path.to_string();
            let rel = full.strip_prefix(&base_prefix).unwrap_or(&full);
            let bytes = read_store_file_bytes(meta.clone(), &path).await?;
            let sha = blake3_hash(&bytes);
            zip_write_file(&mut zw, &format!("meta/{}", rel), &bytes)?;
            manifest.files.push(ManifestEntry {
                store: StoreKind::Meta,
                rel_path: rel.to_string(),
                size,
                blake3: sha,
            });
        }

        for (path, size) in storage_files {
            let full = path.to_string();
            let rel = full.strip_prefix(&base_prefix).unwrap_or(&full);
            let bytes = read_store_file_bytes(storage.clone(), &path).await?;
            let sha = blake3_hash(&bytes);
            zip_write_file(&mut zw, &format!("storage/{}", rel), &bytes)?;
            manifest.files.push(ManifestEntry {
                store: StoreKind::Storage,
                rel_path: rel.to_string(),
                size,
                blake3: sha,
            });
        }

        let manifest_bytes = flow_like_types::json::to_vec(&manifest)?;
        zip_write_file(&mut zw, "manifest.json", &manifest_bytes)?;
        let zipped = zip_finish(zw)?;
        let zipped = zipped.into_inner();

        if let Some(pw) = password {
            let enc = encrypt_bytes(pw, &zipped)?;
            Ok((enc, ".sec.flow-app"))
        } else {
            Ok((zipped, ".flow-app"))
        }
    }

    // Imports an archive into the stores; loads the App by ID from the manifest (creating it implicitly via files).
    pub async fn import_archive(
        app_state: Arc<Mutex<FlowLikeState>>,
        source_file: PathBuf,
        password: Option<&str>,
    ) -> flow_like_types::Result<Self> {
        let data = std::fs::read(&source_file)?;
        let plain = if is_zip(&data) {
            data
        } else if let Some(pw) = password {
            decrypt_bytes(pw, &data)?
        } else {
            return Err(anyhow!("Archive is encrypted; password required"));
        };

        if !is_zip(&plain) {
            return Err(anyhow!("Invalid archive format"));
        }

        let cursor = std::io::Cursor::new(&plain);
        let mut zip = ZipArchive::new(cursor)?;
        let mut files_map: HashMap<String, Vec<u8>> = HashMap::new();

        for i in 0..zip.len() {
            let mut f = zip.by_index(i)?;
            if f.is_dir() {
                continue;
            }
            let name = f.name().to_string();
            let mut buf = Vec::with_capacity(f.size() as usize);
            std::io::copy(&mut f, &mut buf)?;
            files_map.insert(name, buf);
        }

        let manifest_bytes = files_map
            .get("manifest.json")
            .ok_or(anyhow!("Missing manifest.json"))?;
        let manifest: ExportManifest = flow_like_types::json::from_slice(manifest_bytes)?;

        let meta = FlowLikeState::project_meta_store(&app_state)
            .await?
            .as_generic();
        let storage = FlowLikeState::project_storage_store(&app_state)
            .await?
            .as_generic();

        let base = Path::from("apps").child(manifest.app_id.clone());

        for entry in &manifest.files {
            let prefix = match entry.store {
                StoreKind::Meta => "meta/",
                StoreKind::Storage => "storage/",
            };
            let zip_name = format!("{}{}", prefix, entry.rel_path);
            let data = files_map
                .get(&zip_name)
                .ok_or_else(|| anyhow!("Missing file in archive: {}", zip_name))?;

            if blake3_hash(data) != entry.blake3 {
                return Err(anyhow!("Hash mismatch for {}", entry.rel_path));
            }

            let target_path = base.child(entry.rel_path.clone());
            let store = match entry.store {
                StoreKind::Meta => &meta,
                StoreKind::Storage => &storage,
            };

            let payload = PutPayload::from_bytes(Bytes::from(data.to_owned()));
            store.put(&target_path, payload).await?;
        }

        let mut app = App::load(manifest.app_id.clone(), app_state.clone()).await?;
        app.updated_at = SystemTime::now();
        app.save().await?;

        Ok(app)
    }
}