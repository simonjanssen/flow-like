import {
	CircleUserIcon,
	CloudAlertIcon,
	FlaskConicalIcon,
	GlobeLockIcon,
	Star,
} from "lucide-react";
import { type IApp, IAppVisibility } from "../../lib/schema/app/app";
import type { IMetadata } from "../../lib/schema/bit/bit";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

interface AppCardProps {
	app: IApp;
	metadata?: IMetadata;
	variant: "extended" | "small";
	onClick?: () => void;
	className?: string;
}

export function AppCard({
	app,
	metadata,
	variant = "extended",
	onClick,
	className = "",
}: Readonly<AppCardProps>) {
	if (variant === "small") {
		return (
			<button
				type="button"
				onClick={onClick}
				className={`group flex items-center gap-3 p-2.5 flex-grow rounded-lg border border-border/40 bg-card hover:bg-accent/50 transition-all duration-200 w-full min-h-[60px] max-w-full overflow-hidden ${className}`}
			>
				{/* App Icon */}
				<div className="relative shrink-0">
					<Avatar className="w-10 h-10 shadow-sm">
						<AvatarImage
							className="scale-100 group-hover:scale-95 transition-transform duration-200"
							src={metadata?.icon ?? "/app-logo.webp"}
							alt={`${metadata?.name ?? app.id} icon`}
						/>
						<AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/20 to-primary/10">
							{(metadata?.name ?? app.id).substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					{/* Visibility indicator - only show if not public */}
					{app.visibility !== IAppVisibility.Public && (
						<div className="absolute -top-0.5 -right-0.5 bg-background border border-border rounded-full p-0.5 shadow-sm">
							<div className="w-2 h-2">
								<VisibilityIcon visibility={app.visibility} />
							</div>
						</div>
					)}
				</div>

				{/* App Info */}
				<div className="flex flex-col items-start text-left min-w-0 flex-1 gap-0.5 max-w-full">
					{/* Title and Price Row */}
					<div className="flex items-center justify-between w-full">
						<h4 className="font-semibold text-sm text-foreground truncate leading-tight">
							{metadata?.name ?? app.id}
						</h4>
						{app.visibility === IAppVisibility.Public && (
							<div className="shrink-0 ml-2">
								{app.price && app.price > 0 ? (
									<span className="text-xs font-medium text-primary">
										€{(app.price / 100).toFixed(2)}
									</span>
								) : (
									<span className="text-xs font-medium text-green-600 dark:text-green-400">
										FREE
									</span>
								)}
							</div>
						)}
					</div>

					{/* Description and Rating Row */}
					<div className="flex items-center justify-between w-full max-w-full">
						<p className="text-xs text-muted-foreground truncate flex-1 mr-2 max-w-64">
							{metadata?.description ?? "No description available"}
						</p>

						<div className="flex items-center gap-1 shrink-0">
							{app.rating_count > 0 ? (
								<>
									<Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
									<span className="text-xs font-medium">
										{(app.avg_rating ?? 0).toFixed(1)}
									</span>
								</>
							) : (
								<span className="text-xs text-muted-foreground">New</span>
							)}
						</div>
					</div>
				</div>
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className={`group relative flex flex-col transition-all duration-300 rounded-xl border border-border/40 bg-card shadow-sm hover:shadow-xl hover:border-primary/30 hover:bg-card/95 w-72 h-[375px] overflow-hidden ${className}`}
		>
			{/* Thumbnail Section - Fixed aspect ratio */}
			<div className="relative w-full h-40 overflow-hidden">
				<img
					className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
					src={metadata?.thumbnail ?? "/placeholder-thumbnail.webp"}
					alt={metadata?.name ?? app.id}
					width={1280}
					height={640}
					loading="lazy"
					decoding="async"
					fetchPriority="low"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

				{/* Visibility Badge */}
				<div className="absolute top-3 right-3 z-10">
					<div className="bg-black/40 backdrop-blur-sm text-white rounded-lg px-2 py-1 text-xs font-medium">
						<VisibilityIcon visibility={app.visibility} />
					</div>
				</div>

				{/* App Icon and Price/Free Badge */}
				<div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
					<Avatar className="w-16 h-16 shadow-lg bg-white/10 backdrop-blur-md">
						<AvatarImage
							className="scale-100 group-hover:scale-90 transition-transform duration-300"
							src={metadata?.icon ?? "/app-logo.webp"}
							alt={`${metadata?.name ?? app.id} icon`}
						/>
						<AvatarFallback className="text-lg font-bold bg-white/20 backdrop-blur-md text-white border border-white/30">
							{(metadata?.name ?? app.id).substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					{app.visibility === IAppVisibility.Public && (
						<div className="mb-2">
							{app.price && app.price > 0 ? (
								<div className="bg-white/90 backdrop-blur-sm text-gray-900 rounded-full px-3 py-1 text-sm font-bold shadow-lg">
									€{(app.price / 100).toFixed(2)}
								</div>
							) : (
								<div className="bg-green-500 text-white rounded-full px-3 py-1 text-sm font-bold shadow-lg">
									FREE
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Content Section */}
			<div className="flex flex-col p-5 flex-1">
				{/* App Name */}
				<h3 className="font-bold text-lg text-foreground text-left leading-tight line-clamp-1 min-h-[1.5rem] mb-2">
					{metadata?.name ?? app.id}
				</h3>

				{/* Category */}
				<div className="flex items-center gap-2 mb-3">
					<Badge variant="default" className="text-xs px-2 py-1">
						{app.primary_category ?? "Other"}
					</Badge>
					<Badge variant="outline" className="text-xs px-2 py-1">
						{metadata?.age_rating ?? 0}+
					</Badge>
				</div>

				{/* Description */}
				<p className="text-sm text-muted-foreground text-left line-clamp-3 leading-relaxed min-h-[4.4rem] mb-3 overflow-hidden">
					{metadata?.description ?? "No description available"}
				</p>

				{/* Rating and Reviews */}
				<div className="flex items-center justify-between mb-1">
					<div className="flex items-center gap-2">
						{app.rating_count > 0 ? (
							<>
								<div className="flex items-center gap-1">
									<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
									<span className="font-semibold text-sm">
										{(app.avg_rating ?? 0).toFixed(1)}
									</span>
								</div>
								<span className="text-xs text-muted-foreground">
									({app.rating_count.toLocaleString()})
								</span>
							</>
						) : (
							<span className="text-xs text-muted-foreground">
								No ratings yet
							</span>
						)}
					</div>
				</div>
			</div>
		</button>
	);
}

function VisibilityIcon({
	visibility,
}: Readonly<{ visibility: IAppVisibility }>) {
	switch (visibility) {
		case IAppVisibility.Offline:
			return (
				<HoverCard>
					<HoverCardTrigger>
						<CloudAlertIcon className="w-4 h-4" />
					</HoverCardTrigger>
					<HoverCardContent className="bg-card text-muted-foreground z-[100]">
						<p className="text-xs">This app is currently offline.</p>
					</HoverCardContent>
				</HoverCard>
			);
		case IAppVisibility.Private:
			return (
				<HoverCard>
					<HoverCardTrigger>
						<CircleUserIcon className="w-4 h-4" />
					</HoverCardTrigger>
					<HoverCardContent className="bg-card text-muted-foreground">
						<p className="text-xs">This app is private.</p>
					</HoverCardContent>
				</HoverCard>
			);
		case IAppVisibility.Prototype:
			return (
				<HoverCard>
					<HoverCardTrigger>
						<FlaskConicalIcon className="w-4 h-4 " />
					</HoverCardTrigger>
					<HoverCardContent className="bg-card text-muted-foreground">
						<p className="text-xs">This app is a prototype.</p>
					</HoverCardContent>
				</HoverCard>
			);
		case IAppVisibility.Public:
			return null;
		case IAppVisibility.PublicRequestAccess:
			return (
				<HoverCard>
					<HoverCardTrigger>
						<GlobeLockIcon className="w-4 h-4" />
					</HoverCardTrigger>
					<HoverCardContent className="bg-card text-muted-foreground">
						<p className="text-xs">
							This app is public, but requires access request.
						</p>
					</HoverCardContent>
				</HoverCard>
			);
	}
}
