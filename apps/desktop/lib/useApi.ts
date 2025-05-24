import { useQuery, UseQueryResult } from "@tm9657/flow-like-ui";
import { fetcher } from "./api";
import { useAuth } from "react-oidc-context";

export function useApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    data?: any,
    enabled?: boolean
): UseQueryResult<T, Error> {
    const auth = useAuth()
    const query = useQuery<T, Error>({
		queryKey: [method, path, data, auth?.user?.profile?.sub ?? "anon"],
		queryFn: async () => {
			const response = await fetcher<T>(path, {
                method,
                body: data ? JSON.stringify(data) : undefined,
            }, auth);

            return response;
		},
		enabled,
	});

	return query;
}