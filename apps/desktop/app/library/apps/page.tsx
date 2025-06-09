"use client";

import {
	AppCard,
	Button,
	EmptyState,
	Separator,
	useBackend,
	useInvoke,
} from "@tm9657/flow-like-ui";
import { FilesIcon, LayoutGridIcon, LinkIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function YoursPage() {
	const backend = useBackend();
	const apps = useInvoke(backend.getApps, []);
	const router = useRouter();

	return (
		<main className="justify-start flex min-h-dvh max-h-dvh flex-row items-start w-full flex-1 flex-grow p-4">
			<div className="mr-6 max-h-screen overflow-y-auto invisible-scroll flex-2 flex-grow h-full w-full">
				<div className="flex flex-row items-center">
					<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
						Your Apps
					</h1>
					<Link href={"/library/new"}>
						<Button variant="default" className="ml-4">
							<Plus className="mr-2 h-4 w-4" /> Create
						</Button>
					</Link>
				</div>
				<Separator className="my-4" />
				<div className="flex flex-row items-center flex-wrap min-h-full flex-grow h-full gap-4">
					{apps.data?.length === 0 && (
						<EmptyState
							action={{
								label: "Create App",
								onClick: () => {
									router.push("/library/new");
								},
							}}
							icons={[LayoutGridIcon, FilesIcon, LinkIcon]}
							className="min-w-full min-h-full flex-grow h-full"
							title="No Apps Found"
							description="Create a custom app based on your Data for Free and Secure."
						/>
					)}
					{apps.data
						?.sort(
							(a, b) =>
								a[0].updated_at.nanos_since_epoch -
								b[0].updated_at.nanos_since_epoch,
						)
						.map((app, i) => {
							return (
								<AppCard
									key={app[0].id}
									app={app[0]}
									metadata={app[1]}
									variant="extended"
									onClick={() => router.push(`/library/config?id=${app[0].id}`)}
								/>
							);
						})}
				</div>
			</div>
		</main>
	);
}
