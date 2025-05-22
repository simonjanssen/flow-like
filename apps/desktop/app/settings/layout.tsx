"use client";
export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<main className="flex min-h-dvh flex-col w-full max-h-dvh h-dvh overflow-hidden p-4">
			{children}
		</main>
	);
}
