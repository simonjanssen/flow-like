import type { AuthContextProps } from "react-oidc-context";

function constructUrl(path: string): string {
	const baseUrl = process.env.NEXT_PUBLIC_API_URL!;
	return `${baseUrl}${path}`;
}

export async function fetcher<T>(
	path: string,
	options?: RequestInit,
	auth?: AuthContextProps,
): Promise<T> {
	const headers: HeadersInit = {};
	if (auth?.user?.id_token) {
		headers["Authorization"] = `Bearer ${auth?.user?.id_token}`;
	}

	const url = constructUrl(path);
	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
			...headers,
		},
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
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(path, {
		method: "POST",
		body: data ? JSON.stringify(data) : undefined,
	});
}

export async function get<T>(
	path: string,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(path, {
		method: "GET",
	});
}

export async function put<T>(
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(path, {
		method: "PUT",
		body: data ? JSON.stringify(data) : undefined,
	});
}

export async function del<T>(
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(path, {
		method: "DELETE",
		body: data ? JSON.stringify(data) : undefined,
	});
}

export async function patch<T>(
	path: string,
	data?: any,
	auth?: AuthContextProps,
): Promise<T> {
	return fetcher<T>(path, {
		method: "PATCH",
		body: data ? JSON.stringify(data) : undefined,
	});
}
