import type { ReactElement } from "react";

export interface IToolBarActions {
	pushToolbarElements: (elements: ReactElement[]) => void;
}

export interface ISidebarActions {
	pushSidebar: (sidebar?: ReactElement) => void;
	toggleOpen: () => void;
	isMobile: () => boolean;
	isOpen: () => boolean;
}
