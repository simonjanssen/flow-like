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
	// Helper function to render star rating
	const renderStarRating = (rating: number, count: number) => {
		const stars = [];
		const fullStars = Math.floor(rating);
		const hasHalfStar = rating % 1 >= 0.5;

		for (let i = 0; i < 5; i++) {
			if (i < fullStars) {
				stars.push(
					<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />,
				);
			} else if (i === fullStars && hasHalfStar) {
				stars.push(
					<div key={i} className="relative w-3 h-3">
						<Star className="w-3 h-3 text-gray-300 absolute" />
						<div className="overflow-hidden w-1/2">
							<Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
						</div>
					</div>,
				);
			} else {
				stars.push(<Star key={i} className="w-3 h-3 text-gray-300" />);
			}
		}

		return (
			<div className="flex items-center gap-1">
				<div className="flex gap-0.5">{stars}</div>
				<span className="text-xs text-muted-foreground">({count})</span>
			</div>
		);
	};

	if (variant === "small") {
		return (
			<button
				type="button"
				onClick={onClick}
				className={`group flex items-center gap-4 p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm hover:bg-card/90 hover:border-primary hover:shadow-lg transition-all duration-300 w-72 min-h-[88px] ${className}`}
			>
				{/* App Icon */}
				<div className="relative shrink-0">
					<Avatar className="w-14 h-14 border-2 border-border/50 shadow-sm transition-all duration-300 group-hover:scale-105">
						<AvatarImage
							className="scale-105 transition-transform duration-300 group-hover:scale-110"
							src={metadata?.icon ?? "/app-logo.webp"}
							alt={`${metadata?.name ?? app.id} icon`}
						/>
						<AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
							{(metadata?.name ?? app.id).substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					{/* Visibility indicator on avatar */}
					<div className="absolute -top-1 -right-1 bg-background border border-border rounded-full p-1 shadow-sm">
						<VisibilityIcon visibility={app.visibility} />
					</div>
				</div>

				{/* App Info */}
				<div className="flex flex-col items-start text-left min-w-0 flex-1 gap-1">
					{/* Title and Price Row */}
					<div className="flex items-center justify-between w-full">
						<h4 className="font-semibold text-foreground text-base truncate flex-1 leading-tight h-5">
							{metadata?.name ?? app.id}
						</h4>
						{app.visibility === IAppVisibility.Public && (
							<div className="flex items-center gap-0 ml-3 shrink-0 h-4">
								{app.price && app.price > 0 ? (
									<Badge
										variant="outline"
										className="text-xs font-medium px-2 py-1 bg-primary/5"
									>
										€{(app.price / 100).toFixed(2)}
									</Badge>
								) : (
									<Badge
										variant="outline"
										className="text-xs font-medium px-2 py-1 bg-green-200/40 text-green-500 border-green-500 dark:bg-green-500/40 dark:text-green-200 dark:border-green-200"
									>
										Free
									</Badge>
								)}
							</div>
						)}
					</div>

					{/* Description */}
					<p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed w-full">
						{metadata?.description ?? "No description available"}
					</p>
				</div>
			</button>
		);
	}

	return (
		<button
			type="button"
			onClick={onClick}
			className={`group relative flex flex-col transition-all duration-500 rounded-lg border-2 border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:bg-card/80 transform hover:-translate-y-1 w-64 ${className}`}
		>
			{/* Thumbnail Section - 16:9 aspect ratio */}
			<div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
				<img
					className="absolute rounded-t-lg inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
					src={metadata?.thumbnail ?? "/placeholder-thumbnail.webp"}
					alt={metadata?.name ?? app.id}
					width={1280}
					height={640}
					loading="lazy"
					decoding="async"
					fetchPriority="low"
				/>
				<div className="absolute inset-0 bg-black/20 group-hover:bg-primary/10 transition-all duration-300" />
				<div className="absolute top-3 right-3 z-10 bg-background text-foreground rounded-full p-1 shadow-lg">
					<VisibilityIcon visibility={app.visibility} />
				</div>
				{/* Gradient Overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

				{/* App Icon Overlay */}
				<div className="absolute bottom-3 left-3">
					<Avatar className="w-12 h-12 border bg-background transition-transform duration-200 z-50">
						<AvatarImage
							className="scale-110 duration-500 transition-transform group-hover:scale-125"
							src={metadata?.icon ?? "/app-logo.webp"}
							alt={`${metadata?.name ?? app.id} icon`}
						/>
						<AvatarFallback className="text-sm font-medium">
							{(metadata?.name ?? app.id).substring(0, 2).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</div>
			</div>

			{/* Content Section */}
			<div className="flex flex-col p-4 space-y-2 flex-1 max-w-full overflow-hidden w-full">
				{/* Category and Age Rating at top */}
				<div className="flex flex-row items-center justify-between w-full">
					<div className="flex items-center gap-2">
						<Badge variant="default" className="text-xs">
							{app.primary_category ?? "Other"}
						</Badge>
						{app.visibility === IAppVisibility.Public &&
							app.price &&
							app.price > 0 && (
								<Badge variant="outline" className="text-xs font-medium">
									€{(app.price / 100).toFixed(2)}
								</Badge>
							)}
					</div>
					<Badge variant="secondary" className="text-xs">
						{metadata?.age_rating ?? 0}+
					</Badge>
				</div>

				<h3 className="font-semibold text-foreground text-left leading-tight truncate max-w-full overflow-hidden">
					{metadata?.name ?? app.id}
				</h3>

				<p className="text-sm text-muted-foreground text-left line-clamp-2 leading-relaxed max-w-full overflow-hidden h-11">
					{metadata?.description ?? "No description available"}
				</p>

				{/* Star Rating */}
				<div className="flex justify-start py-1">
					{app.rating_count > 0 ? (
						renderStarRating(app.avg_rating || 0, app.rating_count)
					) : (
						<div className="flex items-center gap-1 h-5">
							<div className="flex gap-0.5">
								{[...Array(5)].map((_, i) => (
									<Star key={i} className="w-3 h-3 text-gray-300" />
								))}
							</div>
							<span className="text-xs text-muted-foreground">(0)</span>
						</div>
					)}
				</div>

				{/* Tags Carousel */}
				<div className="relative overflow-hidden h-8 pt-2">
					<div className="flex gap-1 transition-transform duration-500 ease-in-out group-hover:animate-pulse">
						{metadata?.tags &&
						metadata.tags.filter((tag) => tag.trim()).length > 0 ? (
							<div className="flex gap-1 animate-[scroll_8s_linear_infinite] group-hover:animate-[scroll_8s_linear_infinite]">
								{metadata.tags
									.filter((tag) => tag.trim())
									.concat(metadata.tags.filter((tag) => tag.trim())) // Duplicate for seamless loop
									.map((tag, index) => (
										<Badge
											key={tag + index}
											variant="secondary"
											className="text-xs whitespace-nowrap shrink-0"
										>
											{tag}
										</Badge>
									))}
							</div>
						) : (
							<Badge
								variant="secondary"
								className="text-xs whitespace-nowrap shrink-0"
							>
								New
							</Badge>
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
