import { useRouter, useSearchParams } from "next/navigation";

export function useSetQueryParams() {
	const router = useRouter();
	const searchParams = useSearchParams();

	return (key: string, value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set(key, value);
		router.push(`?${params.toString()}`);
	};
}
