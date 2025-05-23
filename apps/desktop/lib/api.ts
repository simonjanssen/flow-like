
function constructUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL!
  return `${baseUrl}${path}`;
}

export async function fetcher<T>(path: string, options?: RequestInit): Promise<T> {
  const url = constructUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching data: ${response.statusText}`);
  }

  return response.json();
}

export async function post<T>(path: string, data: any): Promise<T> {
  return fetcher<T>(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function get<T>(path: string): Promise<T> {
  return fetcher<T>(path, {
    method: 'GET',
  });
}

export async function put<T>(path: string, data: any): Promise<T> {
  return fetcher<T>(path, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function del<T>(path: string): Promise<T> {
  return fetcher<T>(path, {
    method: 'DELETE',
  });
}

export async function patch<T>(path: string, data: any): Promise<T> {
  return fetcher<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}