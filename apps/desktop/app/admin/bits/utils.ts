import { GGMLQuantizationType, gguf, GGUFParseOutput } from "@huggingface/gguf";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

export async function getModelSize(fileName: string, repo?: string) {
    const url = fileName.startsWith("https://") ? fileName : `${repo}/resolve/main/${fileName}?download=true`
    const headers = await fetch(url, {
        method: "HEAD"
    })

    return parseInt(headers.headers.get("content-length") || "0");
}

export function getModelLink(fileName: string, repo?: string) {
    return fileName.startsWith("https://") ? fileName : `${repo}/resolve/main/${fileName}?download=true`
}

export async function getUserInfo(repo: string) {
    try {
        // Extract author from repo URL (go one directory up)
        const repoUrl = repo.startsWith('https://') ? repo : `https://huggingface.co/${repo}`;
        const urlParts = repoUrl.split('/');
        const authorName = urlParts[urlParts.length - 2]; // Get second to last part (author)
        const authorUrl = `https://huggingface.co/${authorName}`;

        // Fetch author page HTML
        const response = await tauriFetch(authorUrl);
        const html = await response.text();

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract avatar image URL
        let avatarUrl = '';
        const avatarImg = doc.querySelector('img.h-full.w-full.rounded-lg.object-cover');
        if (avatarImg) {
            avatarUrl = avatarImg.getAttribute('src') || '';
            // Convert relative URLs to absolute
            if (avatarUrl.startsWith('/')) {
                avatarUrl = `https://huggingface.co${avatarUrl}`;
            }
        }

        // Extract author display name
        let displayName = authorName;
        const h1Element = doc.querySelector('h1');
        if (h1Element?.textContent) {
            displayName = h1Element.textContent.trim();
        } else {
            const nameElement = doc.querySelector('.text-xl, [data-testid="user-name"], .font-semibold');
            if (nameElement?.textContent) {
                displayName = nameElement.textContent.trim();
            }
        }

        return {
            authorUrl,
            authorName,
            displayName,
            avatarUrl
        };
    } catch (error) {
        console.error("Error fetching avatar:", error);
        return {
            authorUrl: repo,
            authorName: '',
            displayName: '',
            avatarUrl: ''
        };
    }
}

export async function getModelLicense(repo: string) {
    try {
        // Convert repo to full URL if needed
        const repoUrl = repo.startsWith('https://') ? repo : `https://huggingface.co/${repo}`;

        // Fetch the repo page HTML
        const response = await tauriFetch(repoUrl);
        const html = await response.text();

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find the license div with the specific classes
        const licenseDivs = [
            ...doc.querySelectorAll('div[class*="tag"]'),
            ...doc.querySelectorAll('.tag'),
            ...doc.querySelectorAll('[class*="license"]'),
            ...doc.querySelectorAll('div:has(span)')
        ];

        const uniqueLicenseDivs = [...new Set(licenseDivs)];

        for (const div of uniqueLicenseDivs) {
            const divText = div.textContent || '';
            if (divText.includes('License:')) {
                console.log("License div found:", div.outerHTML);
                // Extract license name (everything after "License:")
                const licenseName = divText.replace('License:', '').trim();
                if (licenseName) {
                    return licenseName.toLowerCase();
                }
            }
        }

        // Fallback: look for any element containing license information
        const licenseElements = doc.querySelectorAll('[class*="license"], [data-testid*="license"]');
        for (const element of licenseElements) {
            const text = element.textContent?.trim();
            if (text && text.length > 0 && !text.toLowerCase().includes('license:')) {
                return text;
            }
        }

        return 'Unknown';
    } catch (error) {
        console.error("Error fetching model license:", error);
        return 'Unknown';
    }
}

export async function getModelTags(repo: string) {
    try {
        // Convert repo to full URL if needed
        const repoUrl = repo.startsWith('https://') ? repo : `https://huggingface.co/${repo}`;

        // Fetch the repo page HTML
        const response = await tauriFetch(repoUrl);
        const html = await response.text();

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find the license div with the specific classes
        const foundTags = [
            ...doc.querySelectorAll('.tag.tag-white'),
        ];

        const uniqueLicenseDivs = [...new Set(foundTags)];
        const tags = new Set<string>();

        for (const div of uniqueLicenseDivs) {
            // Clone the div and remove all SVG elements
            const clonedDiv = div.cloneNode(true) as Element;
            const svgElements = clonedDiv.querySelectorAll('svg');
            svgElements.forEach(svg => svg.remove());

            const divText = clonedDiv.textContent?.replace("License:", "") || '';

            if (divText.length < 30) tags.add(divText.trim().toLowerCase());
        }

        return Array.from(tags).filter(tag => tag.length > 0);
    } catch (error) {
        return []
    }
}

export async function getModelProjection(repo: string) {
    try {
        // Convert repo to full URL if needed
        const repoUrl = repo.startsWith('https://') ? repo : `https://huggingface.co/${repo}`;

        // Fetch the repo page HTML
        const response = await tauriFetch(repoUrl);
        const html = await response.text();

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find the h1 element containing the model name
        const h1Element = doc.querySelector('h1');
        if (h1Element) {
            const linkElement = h1Element.querySelector('a');
            if (linkElement?.textContent) {
                return linkElement.textContent.trim();
            }
        }

        // Fallback: extract from URL if h1 not found
        const urlParts = repoUrl.split('/');
        return urlParts[urlParts.length - 1]; // Get the last part (model name)
    } catch (error) {
        console.error("Error fetching model name:", error);
        // Fallback: extract from URL
        const urlParts = repo.split('/');
        return urlParts[urlParts.length - 1] || '';
    }
}

export async function getModelName(repo: string) {
    try {
        // Convert repo to full URL if needed
        const repoUrl = repo.startsWith('https://') ? repo : `https://huggingface.co/${repo}`;

        // Fetch the repo page HTML
        const response = await tauriFetch(repoUrl);
        const html = await response.text();

        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Find the h1 element containing the model name
        const h1Element = doc.querySelector('h1');
        if (h1Element) {
            const linkElement = h1Element.querySelector('a');
            if (linkElement?.textContent) {
                return linkElement.textContent.trim();
            }
        }

        // Fallback: extract from URL if h1 not found
        const urlParts = repoUrl.split('/');
        return urlParts[urlParts.length - 1]; // Get the last part (model name)
    } catch (error) {
        console.error("Error fetching model name:", error);
        // Fallback: extract from URL
        const urlParts = repo.split('/');
        return urlParts[urlParts.length - 1] || '';
    }
}

export async function getOriginalRepo(repo: string) {
    const html = await tauriFetch(repo);
    const text = await html.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    const findOriginalModelLink = (selector: string, containsText: string): string | null => {
        const elements = doc.querySelectorAll(selector);
        for (const element of elements) {
            if (element.textContent?.includes(containsText)) {
                const link = element.querySelector('a');
                if (link?.href) {
                    return link.href;
                }
            }
        }
        return null;
    };
    let originalModelHref = findOriginalModelLink('li', 'Original model:');
    if (originalModelHref) return originalModelHref;

    originalModelHref = findOriginalModelLink('li', 'quantized version of');
    if (originalModelHref) return originalModelHref;

    originalModelHref = findOriginalModelLink('p', 'Original model');
    if (originalModelHref) return originalModelHref;

    return repo;
}

export async function getContextLength(fileName: string, repo?: string) {
    try {
        const url = fileName.startsWith("https://") ? fileName : `https://huggingface.co/${repo}/resolve/main/${fileName}`

        const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const response = await tauriFetch(input, {
                body: init?.body,
                headers: init?.headers,
                method: init?.method || "GET",
                redirect: init?.redirect || "follow",
                mode: init?.mode || "cors",
                credentials: init?.credentials || "same-origin",
                referrer: init?.referrer || "",
                referrerPolicy: init?.referrerPolicy || "no-referrer",
                signal: init?.signal,
                cache: init?.cache || "default",
                keepalive: init?.keepalive || false,
                integrity: init?.integrity || "",
                window: init?.window || undefined,
            });
            return response;
        };

        const { metadata, tensorInfos }: GGUFParseOutput<{ strict: false }> = await gguf(url, {
            fetch: customFetch as typeof fetch
        });

        console.dir(metadata, { depth: null })
        for (const key of Object.keys(metadata)) {
            if (key.endsWith(".context_length")) {
                console.log(`Found context_length: ${metadata[key]} for model ${repo}`)
                return metadata[key] as number
            }
        }
    } catch (error) {
        console.error("Error fetching context length:", error);
    }
    return -1
}