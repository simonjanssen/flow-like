"use client";

import { createId } from "@paralleldrive/cuid2";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@tm9657/flow-like-ui";
import { useCallback, useEffect, useState } from "react";

const GlobalAnchorHandler = () => {
	const [contextMenuData, setContextMenuData] = useState<{
		x: number;
		y: number;
		href: string;
		show: boolean;
		title?: string;
	} | null>(null);

	const createNewWindow = useCallback((url: string, title?: string) => {
		const windowLabel = `window-${createId()}`;

		console.log("Creating new window with URL:", url);

		try {
			const _view = new WebviewWindow(windowLabel, {
				url: url,
				title: title ?? "Flow-Like",
				focus: true,
				resizable: true,
				maximized: true,
			});
		} catch (error) {
			console.error("Failed to create new window:", error);
		}
	}, []);

	useEffect(() => {
		const findAnchorElement = (
			target: HTMLElement,
		): HTMLAnchorElement | null => {
			let currentElement: HTMLElement | null = target;
			while (currentElement) {
				if (currentElement.tagName === "A") {
					return currentElement as HTMLAnchorElement;
				}
				currentElement = currentElement.parentElement;
			}
			return null;
		};

		const handleMouseDown = (event: MouseEvent) => {
			if (event.button === 1) {
				const target = event.target as HTMLElement;
				const anchorElement = findAnchorElement(target);

				if (anchorElement?.href) {
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
				}
			}
		};

		const handleAuxClick = (event: MouseEvent) => {
			if (event.button === 1) {
				const target = event.target as HTMLElement;
				const anchorElement = findAnchorElement(target);

				if (anchorElement?.href) {
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();

					const linkTitle =
						anchorElement.textContent?.trim() ??
						anchorElement.getAttribute("title") ??
						undefined;
					console.log("Middle mouse click on anchor:", anchorElement.href);
					createNewWindow(anchorElement.href, linkTitle);
				}
			}
		};

		const handleClick = (event: MouseEvent) => {
			if (event.button === 1) {
				const target = event.target as HTMLElement;
				const anchorElement = findAnchorElement(target);

				if (anchorElement?.href) {
					event.preventDefault();
					event.stopPropagation();
					event.stopImmediatePropagation();
				}
			}
			// Close context menu on any click
			setContextMenuData(null);
		};

		const handleContextMenu = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			const anchorElement = findAnchorElement(target);

			if (anchorElement?.href) {
				event.preventDefault();

				setContextMenuData({
					x: event.clientX,
					y: event.clientY,
					href: anchorElement.href,
					title:
						anchorElement.textContent?.trim() ??
						anchorElement.getAttribute("title") ??
						undefined,
					show: true,
				});
			}
		};

		// Add all event listeners with capture phase
		document.addEventListener("mousedown", handleMouseDown, true);
		document.addEventListener("auxclick", handleAuxClick, true);
		document.addEventListener("click", handleClick, true);
		document.addEventListener("contextmenu", handleContextMenu, true);

		return () => {
			document.removeEventListener("mousedown", handleMouseDown, true);
			document.removeEventListener("auxclick", handleAuxClick, true);
			document.removeEventListener("click", handleClick, true);
			document.removeEventListener("contextmenu", handleContextMenu, true);
		};
	}, []);

	return (
		<>
			{contextMenuData && (
				<div
					style={{
						position: "fixed",
						left: contextMenuData.x,
						top: contextMenuData.y,
						zIndex: 50,
						pointerEvents: "auto",
					}}
				>
					<DropdownMenu
						open={contextMenuData.show}
						onOpenChange={(open) => {
							if (!open) setContextMenuData(null);
						}}
					>
						<DropdownMenuTrigger asChild>
							<div className="w-1 h-1 opacity-0" />
						</DropdownMenuTrigger>
						<DropdownMenuContent side="bottom" align="start">
							<DropdownMenuItem asChild>
								<button
									className="w-full"
									onMouseDown={(e) => {
										e.preventDefault();
										e.stopPropagation();
										console.log("Opening in new tab:", contextMenuData.href);
										createNewWindow(
											contextMenuData.href,
											contextMenuData.title,
										);
										setContextMenuData(null);
									}}
									style={{ cursor: "pointer" }}
								>
									Open in new window
								</button>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<button
									className="w-full"
									onMouseDown={(e) => {
										e.preventDefault();
										e.stopPropagation();
										navigator.clipboard.writeText(contextMenuData.href);
										setContextMenuData(null);
									}}
									style={{ cursor: "pointer" }}
								>
									Copy Link
								</button>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}
		</>
	);
};

export default GlobalAnchorHandler;
