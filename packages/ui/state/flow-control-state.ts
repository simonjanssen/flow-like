import { create } from "zustand";
import type { IPin } from "../lib";

interface IEditPinState {
	pin: IPin;
	node: string;
}

interface IFlowControlState {
	editedPin: IEditPinState | null;
	editPin: (node: string, pin: IPin) => void;
	stopEditPin: () => void;
}

const useFlowControlState = create<IFlowControlState>((set, get) => ({
	editedPin: null,
	editPin: (node, pin) => set({ editedPin: { node, pin } }),
	stopEditPin: () => set({ editedPin: null }),
}));

export default useFlowControlState;
