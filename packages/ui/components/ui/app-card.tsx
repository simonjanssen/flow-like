import {
	CircleUserIcon,
	CloudAlertIcon,
	FlaskConicalIcon,
	GlobeLockIcon,
	LockIcon,
	Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
				className={`group relative flex items-center gap-3 p-2.5 flex-grow rounded-lg border border-border/40 bg-card hover:bg-accent/50 transition-all duration-200 w-full min-h-[60px] max-w-full overflow-hidden ${className}`}
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
					{app.visibility !== IAppVisibility.Public &&
						app.rating_count === 0 && (
							<div className="absolute -top-1.5 -right-1.5 flex flex-row items-center scale-[0.7]">
								<VisibilityIcon visibility={app.visibility} />
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
							{app.rating_count > 0 && (
								<>
									<Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
									<span className="text-xs font-medium">
										{(app.avg_rating ?? 0).toFixed(1)}
									</span>
								</>
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
					<VisibilityIcon visibility={app.visibility} />
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

export function VisibilityIcon({
	visibility,
}: Readonly<{ visibility: IAppVisibility }>) {
	const [isOpen, setIsOpen] = useState(false);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const triggerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isOpen && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setPosition({
				x: rect.left + rect.width / 2,
				y: rect.bottom + 8,
			});
		}
	}, [isOpen]);

	const renderTooltip = (content: React.ReactNode, icon: React.ReactNode) => (
		<>
			<div
				ref={triggerRef}
				className="relative group cursor-pointer"
				onMouseEnter={() => setIsOpen(true)}
				onMouseLeave={() => setIsOpen(false)}
			>
				{icon}
			</div>
			{isOpen &&
				createPortal(
					<div
						className="fixed z-[9999] pointer-events-none"
						style={{
							left: position.x,
							top: position.y,
							transform: "translateX(-50%)",
						}}
					>
						<div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-2xl rounded-lg p-3 animate-in fade-in-0 zoom-in-95 duration-200">
							{content}
						</div>
					</div>,
					document.body,
				)}
		</>
	);

	switch (visibility) {
		case IAppVisibility.Offline:
			return renderTooltip(
				<div className="flex items-center gap-2 text-red-700 dark:text-red-300">
					<div className="w-2 h-2 bg-red-500/70 rounded-full shadow-sm" />
					<p className="text-xs font-medium whitespace-nowrap">
						App is currently offline
					</p>
				</div>,
				<div className="relative bg-white/15 dark:bg-white/8 backdrop-blur-md rounded-full p-2 border border-white/25 dark:border-white/15 shadow-lg group-hover:shadow-xl transition-all duration-300">
					<div className="absolute inset-0 bg-red-500/25 rounded-full group-hover:bg-red-500/35 transition-all duration-300" />
					<LockIcon className="w-3 h-3 text-red-100 relative z-10 drop-shadow-sm group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
				</div>,
			);

		case IAppVisibility.Private:
			return renderTooltip(
				<div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
					<div className="w-2 h-2 bg-gradient-to-r from-purple-500/70 to-pink-500/70 rounded-full shadow-sm" />
					<p className="text-xs font-medium whitespace-nowrap">
						Private access only
					</p>
				</div>,
				<div className="relative bg-white/15 dark:bg-white/8 backdrop-blur-md rounded-full p-2 border border-white/25 dark:border-white/15 shadow-lg group-hover:shadow-xl transition-all duration-300">
					<div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full group-hover:from-purple-500/40 group-hover:to-pink-500/40 transition-all duration-300" />
					<CircleUserIcon className="w-3 h-3 text-purple-100 relative z-10 drop-shadow-sm group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
				</div>,
			);

		case IAppVisibility.Prototype:
			return renderTooltip(
				<div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
					<div className="w-2 h-2 bg-gradient-to-r from-orange-500/70 to-yellow-500/70 rounded-full shadow-sm" />
					<p className="text-xs font-medium whitespace-nowrap">
						Experimental prototype
					</p>
				</div>,
				<div className="relative group cursor-pointer">
					<div className="relative bg-white/15 dark:bg-white/8 backdrop-blur-md rounded-full p-2 border border-white/25 dark:border-white/15 shadow-lg group-hover:shadow-xl transition-all duration-300">
						<div className="absolute inset-0 bg-gradient-to-br from-orange-400/30 to-yellow-400/30 rounded-full group-hover:from-orange-400/45 group-hover:to-yellow-400/45 transition-all duration-300" />
						<FlaskConicalIcon className="w-3 h-3 text-orange-100 relative z-10 drop-shadow-sm transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
					</div>
					<div className="absolute top-0 left-1/2 w-1 h-1 bg-gradient-to-r from-orange-400/90 to-yellow-400/90 backdrop-blur-sm rounded-full -translate-x-1/2 shadow-sm group-hover:scale-125 group-hover:-translate-y-0.5 transition-all duration-300" />
					<div className="absolute top-1 right-0 w-0.5 h-0.5 bg-yellow-400/90 backdrop-blur-sm rounded-full shadow-sm group-hover:scale-150 group-hover:-translate-y-0.5 transition-all duration-300" />
				</div>,
			);

		case IAppVisibility.Public:
			return null;

		case IAppVisibility.PublicRequestAccess:
			return renderTooltip(
				<div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
					<div className="w-2 h-2 bg-gradient-to-r from-blue-500/70 to-cyan-500/70 rounded-full shadow-sm" />
					<p className="text-xs font-medium whitespace-nowrap">
						Public with access request
					</p>
				</div>,
				<div className="relative group cursor-pointer">
					<div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 rounded-full opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500 backdrop-blur-sm" />
					<div className="relative bg-white/20 dark:bg-white/8 backdrop-blur-lg rounded-full p-2 border border-white/30 dark:border-white/20 shadow-xl group-hover:shadow-2xl transition-all duration-300">
						<div className="absolute inset-0 bg-gradient-to-br from-blue-400/25 to-cyan-400/25 rounded-full group-hover:from-blue-400/35 group-hover:to-cyan-400/35 transition-all duration-300" />
						<GlobeLockIcon className="w-3 h-3 text-blue-100 relative z-10 drop-shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6" />
					</div>
				</div>,
			);
	}
}
