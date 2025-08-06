import { useRouter, useSearchParams } from "next/navigation";

export function useSetQueryParams() {
	const router = useRouter();
	const searchParams = useSearchParams();

	return (key: string, value: string | undefined) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value === undefined || value === null) {
			params.delete(key);
		} else {
			params.set(key, value);
		}
		router.push(`?${params.toString()}`);
	};
}
