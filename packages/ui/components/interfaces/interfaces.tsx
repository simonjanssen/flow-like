import type { ReactElement } from "react";

export interface IToolBarActions {
	pushElements: (elements: ReactElement[]) => void;
}
