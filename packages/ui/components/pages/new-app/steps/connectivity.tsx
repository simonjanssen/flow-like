"use client";

import { Check, DownloadCloud, ExternalLink, Settings } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "../../../ui";

export function ConnectivityStep({
	isOffline,
	setIsOffline,
	isAuthenticated,
}: Readonly<{
	isOffline: boolean;
	setIsOffline: (offline: boolean) => void;
	isAuthenticated?: boolean;
}>) {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<ConnectivityModeOption
					title="Online Mode"
					subtitle="Cloud-powered with remote APIs"
					icon={ExternalLink}
					selected={!isOffline}
					onClick={() => {
						if (!isAuthenticated) {
							toast.error("You must be logged in to create an online project.");
							return;
						}
						setIsOffline(false);
					}}
				/>
				<ConnectivityModeOption
					title="Offline Mode"
					subtitle="Local processing only"
					icon={DownloadCloud}
					selected={isOffline}
					onClick={() => setIsOffline(true)}
				/>
			</div>
			<ModeDescription isOffline={isOffline} />
			<div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
				<Settings className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
				<div className="text-sm text-amber-800 dark:text-amber-200">
					<strong>Important:</strong> You cannot switch between Online and
					Offline modes after creation.
				</div>
			</div>
		</div>
	);
}

function ConnectivityModeOption({
	title,
	subtitle,
	icon: Icon,
	selected,
	onClick,
}: Readonly<{
	title: string;
	subtitle: string;
	icon: React.ComponentType<any>;
	selected: boolean;
	onClick: () => void;
}>) {
	return (
		<Card
			className={`cursor-pointer transition-all duration-200 relative h-32 ${
				selected
					? "ring-2 ring-primary bg-gradient-to-br from-primary/5 to-transparent"
					: "hover:border-primary/30"
			}`}
			onClick={onClick}
		>
			<CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
				<div
					className={`p-3 rounded-lg mb-3 ${selected ? "bg-primary/20" : "bg-muted"}`}
				>
					<Icon
						className={`h-6 w-6 ${selected ? "text-primary" : "text-muted-foreground"}`}
					/>
				</div>
				<div className="font-medium">{title}</div>
				<div className="text-sm text-muted-foreground">{subtitle}</div>
				{selected && (
					<div className="absolute top-3 right-3">
						<div className="p-1 bg-primary rounded-full">
							<Check className="h-3 w-3 text-primary-foreground" />
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function ModeDescription({ isOffline }: Readonly<{ isOffline: boolean }>) {
	return (
		<div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
			{isOffline ? (
				<div className="flex items-start gap-3">
					<DownloadCloud className="min-w-5 min-h-5 h-5 w-5 mt-0.5 text-blue-500" />
					<div>
						<strong>Offline Mode:</strong> Your app will run entirely on your
						local machine. All processing, including AI models, will be handled
						locally for maximum privacy and reliability.
					</div>
				</div>
			) : (
				<div className="flex items-start gap-3">
					<ExternalLink className="min-w-5 min-h-5 h-5 w-5 mt-0.5 text-green-500" />
					<div>
						<strong>Online Mode:</strong> Your app can leverage cloud services
						and remote APIs for enhanced capabilities and performance, while
						maintaining local execution options.
					</div>
				</div>
			)}
		</div>
	);
}
