import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { IProfile } from "@tm9657/flow-like-ui";
import type { AuthContextProps } from "react-oidc-context";

function constructUrl(profile: IProfile, path: string): string {
	let baseUrl = profile.hub ?? "api.flow-like.com";
	if (process.env.NEXT_PUBLIC_API_URL)
		baseUrl = process.env.NEXT_PUBLIC_API_URL;
	if (!baseUrl.endsWith("/")) {
		baseUrl += "/";
	}

	if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
		// If the base URL is already a full URL, use it as is
		return `${baseUrl}api/v1/${path}`;
	}

	return `https://${baseUrl}api/v1/${path}`;
}

export async function fetcher<T>(
	profile: IProfile,
	path: string,
	options?: RequestInit,
	auth?: AuthContextProps,
): Promise<T> {
	const headers: HeadersInit = {};
	if (auth?.user?.id_token) {
		headers["Authorization"] = `Bearer ${auth?.user?.id_token}`;
	}

	const url = constructUrl(profile, path);
	const response = await tauriFetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
			...headers,
		},
		keepalive: true,
		priority: "high",
	});

	if (!response.ok) {
		if (response.status === 401 && auth) {
			await auth?.revokeTokens();
			auth?.startSilentRenew();
		}
		throw new Error(`Error fetching data: ${response.statusText}`);
	}

	return response.json();
}

export async function post<T>(
	profile: IProfile,
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(
		profile,
		path,
		{
			method: "POST",
			body: data ? JSON.stringify(data) : undefined,
		},
		auth,
	);
}

export async function get<T>(
	profile: IProfile,
	path: string,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(
		profile,
		path,
		{
			method: "GET",
		},
		auth,
	);
}

export async function put<T>(
	profile: IProfile,
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(
		profile,
		path,
		{
			method: "PUT",
			body: data ? JSON.stringify(data) : undefined,
		},
		auth,
	);
}

export async function del<T>(
	profile: IProfile,
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(
		profile,
		path,
		{
			method: "DELETE",
			body: data ? JSON.stringify(data) : undefined,
		},
		auth,
	);
}

export async function patch<T>(
	profile: IProfile,
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(
		profile,
		path,
		{
			method: "PATCH",
			body: data ? JSON.stringify(data) : undefined,
		},
		auth,
	);
}
