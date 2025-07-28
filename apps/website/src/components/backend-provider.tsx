import {
	EmptyAIState,
	EmptyAppState,
	EmptyBitState,
	EmptyBoardState,
	EmptyEventState,
	EmptyHelperState,
	EmptyRoleState,
	EmptyStorageState,
	EmptyTeamState,
	EmptyTemplateState,
	EmptyUserState,
	type IAIState,
	type IAppState,
	type IBackendState,
	type IBitState,
	type IBoardState,
	type IEventState,
	type IHelperState,
	type IRoleState,
	type IStorageState,
	type ITeamState,
	type ITemplateState,
	type IUserState,
	LoadingScreen,
	useBackendStore,
} from "@tm9657/flow-like-ui";
import { Suspense, lazy, useEffect, useState } from "react";

const BoardWrapper = lazy(() => import("./board-wrapper"));
export class EmptyBackend implements IBackendState {
	aiState: IAIState = new EmptyAIState();
	appState: IAppState = new EmptyAppState();
	bitState: IBitState = new EmptyBitState();
	boardState: IBoardState = new EmptyBoardState();
	eventState: IEventState = new EmptyEventState();
	helperState: IHelperState = new EmptyHelperState();
	roleState: IRoleState = new EmptyRoleState();
	storageState: IStorageState = new EmptyStorageState();
	teamState: ITeamState = new EmptyTeamState();
	templateState: ITemplateState = new EmptyTemplateState();
	userState: IUserState = new EmptyUserState();
}

export function EmptyBackendProvider({
	nodes,
	edges,
}: Readonly<{ nodes: any[]; edges: any[] }>) {
	const [loaded, setLoaded] = useState(false);
	const { setBackend } = useBackendStore();

	useEffect(() => {
		(async () => {
			const backend = new EmptyBackend();
			setBackend(backend);
			setLoaded(true);
		})();
	}, []);

	if (!loaded) {
		return <LoadingScreen />;
	}

	return (
		<Suspense fallback={<LoadingScreen />}>
			<BoardWrapper nodes={nodes} edges={edges} />
		</Suspense>
	);
}
