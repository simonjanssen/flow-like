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
	PersistQueryClientProvider,
	QueryClient,
	ThemeProvider,
	createIDBPersister,
	useBackendStore,
} from "@tm9657/flow-like-ui";
import type { IAIState } from "@tm9657/flow-like-ui/state/backend-state/ai-state";
import { useEffect, useState } from "react";
import { Board } from "./board";

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
const persister = createIDBPersister();
const queryClient = new QueryClient();
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
		<ThemeProvider
			attribute="class"
			defaultTheme="dark"
			enableSystem
			disableTransitionOnChange
		>
			<PersistQueryClientProvider
				client={queryClient}
				persistOptions={{
					persister,
				}}
			>
				<Board nodes={nodes} edges={edges} />
			</PersistQueryClientProvider>
		</ThemeProvider>
	);
}
