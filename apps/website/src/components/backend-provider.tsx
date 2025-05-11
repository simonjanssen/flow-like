import { createIDBPersister, PersistQueryClientProvider, QueryClient, useBackendStore, type IApp, type IBackendState, type IBit, type IBitPack, type IBitTypes, type IBoard, type IDownloadProgress, type IExecutionStage, type IFileMetadata, type IGenericCommand, type IIntercomEvent, type ILog, type ILogLevel, type ILogMetadata, type INode, type IProfile, type IRunPayload, type ISettingsProfile, type IVersionType } from "@tm9657/flow-like-ui";
import { useEffect, useState } from "react";
import { Board } from "./board";

export class EmptyBackend implements IBackendState {
    getApps(): Promise<IApp[]> {
        throw new Error("Method not implemented.");
    }
    getApp(appId: string): Promise<IApp> {
        throw new Error("Method not implemented.");
    }
    getBoards(appId: string): Promise<IBoard[]> {
        throw new Error("Method not implemented.");
    }
    getCatalog(): Promise<INode[]> {
        throw new Error("Method not implemented.");
    }
    getBoard(appId: string, boardId: string, version?: [number, number, number]): Promise<IBoard> {
        throw new Error("Method not implemented.");
    }
    createBoardVersion(appId: string, boardId: string, versionType: IVersionType): Promise<[number, number, number]> {
        throw new Error("Method not implemented.");
    }
    getBoardVersions(appId: string, boardId: string): Promise<[number, number, number][]> {
        throw new Error("Method not implemented.");
    }
    getOpenBoards(): Promise<[string, string, string][]> {
        throw new Error("Method not implemented.");
    }
    getBoardSettings(): Promise<"straight" | "step" | "simpleBezier"> {
        throw new Error("Method not implemented.");
    }
    executeBoard(appId: string, boardId: string, payload: IRunPayload, cb?: (event: IIntercomEvent[]) => void): Promise<ILogMetadata | undefined> {
        throw new Error("Method not implemented.");
    }
    listRuns(appId: string, boardId: string, nodeId?: string, from?: number, to?: number, status?: ILogLevel, limit?: number, offset?: number, lastMeta?: ILogMetadata): Promise<ILogMetadata[]> {
        throw new Error("Method not implemented.");
    }
    queryRun(logMeta: ILogMetadata, query: string, limit?: number, offset?: number): Promise<ILog[]> {
        throw new Error("Method not implemented.");
    }
    finalizeRun(appId: string, runId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    undoBoard(appId: string, boardId: string, commands: IGenericCommand[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
    redoBoard(appId: string, boardId: string, commands: IGenericCommand[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateBoardMeta(appId: string, boardId: string, name: string, description: string, logLevel: ILogLevel, stage: IExecutionStage): Promise<void> {
        throw new Error("Method not implemented.");
    }
    closeBoard(boardId: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getProfile(): Promise<IProfile> {
        throw new Error("Method not implemented.");
    }
    getSettingsProfile(): Promise<ISettingsProfile> {
        throw new Error("Method not implemented.");
    }
    executeCommand(appId: string, boardId: string, command: IGenericCommand): Promise<IGenericCommand> {
        throw new Error("Method not implemented.");
    }
    executeCommands(appId: string, boardId: string, commands: IGenericCommand[]): Promise<IGenericCommand[]> {
        throw new Error("Method not implemented.");
    }
    registerEvent(appId: string, boardId: string, nodeId: string, eventType: string, eventId: string, ttl?: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    removeEvent(eventId: string, eventType: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getPathMeta(folderPath: string): Promise<IFileMetadata[]> {
        throw new Error("Method not implemented.");
    }
    openFileOrFolderMenu(multiple: boolean, directory: boolean, recursive: boolean): Promise<string[] | string | undefined> {
        throw new Error("Method not implemented.");
    }
    getInstalledBit(bits: IBit[]): Promise<IBit[]> {
        throw new Error("Method not implemented.");
    }
    getPackFromBit(bit: IBit): Promise<{ bits: IBit[]; }> {
        throw new Error("Method not implemented.");
    }
    downloadBit(bit: IBit, pack: IBitPack, cb?: (progress: IDownloadProgress[]) => void): Promise<IBit[]> {
        throw new Error("Method not implemented.");
    }
    deleteBit(bit: IBit): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getBit(id: string, hub?: string): Promise<IBit> {
        throw new Error("Method not implemented.");
    }
    addBit(bit: IBit, profile: ISettingsProfile): Promise<void> {
        throw new Error("Method not implemented.");
    }
    removeBit(bit: IBit, profile: ISettingsProfile): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getPackSize(bits: IBit[]): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getBitSize(bit: IBit): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getBitsByCategory(type: IBitTypes): Promise<IBit[]> {
        throw new Error("Method not implemented.");
    }
    isBitInstalled(bit: IBit): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

}
const persister = createIDBPersister();
const queryClient = new QueryClient();
export function EmptyBackendProvider({ nodes, edges }: Readonly<{ nodes: any[], edges: any[] }>) {
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
        return <p>Loading...</p>;
    }

    return <PersistQueryClientProvider client={queryClient}
        persistOptions={{
            persister,
        }}>
        <Board nodes={nodes} edges={edges} />
    </PersistQueryClientProvider>
}
