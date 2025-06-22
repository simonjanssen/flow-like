import {
	type UseQueryResult,
	useBackend,
	useInvoke,
	useQuery,
} from "@tm9657/flow-like-ui";
import { useAuth } from "react-oidc-context";
import { fetcher } from "./api";

export function useApi<T>(
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
	path: string,
	data?: any,
	enabled?: boolean,
): UseQueryResult<T, Error> {
	const auth = useAuth();
	const backend = useBackend();
	const profile = useInvoke(backend.getProfile, []);
	const query = useQuery<T, Error>({
		queryKey: [method, path, data, auth?.user?.profile?.sub ?? "anon"],
		queryFn: async () => {
			const response = await fetcher<T>(
				profile.data!,
				path,
				{
					method,
					body: data ? JSON.stringify(data) : undefined,
				},
				auth,
			);

			return response;
		},
		enabled: enabled && !!profile.data,
	});

	return query;
}


