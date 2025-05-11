import { Background, BackgroundVariant, ReactFlow } from "@tm9657/flow-like-ui";
import { CommentNode } from "@tm9657/flow-like-ui/components/flow/comment-node";
import { FlowNode } from "@tm9657/flow-like-ui/components/flow/flow-node";
import { LayerNode } from "@tm9657/flow-like-ui/components/flow/layer-node";
import { useMemo } from "react";

export function Board({nodes, edges}: Readonly<{nodes: any[], edges: any[]}>) {

    const nodeTypes = useMemo(
            () => ({
                flowNode: FlowNode,
                commentNode: CommentNode,
                layerNode: LayerNode,
                node: FlowNode,
            }),
            [],
    );

    return (
        <div className="min-h-dvh h-dvh max-h-dvh w-full flex-1 flex-grow">
            <ReactFlow
            className="h-full w-full min-h-dvh min-w-dvw"
                suppressHydrationWarning
                nodesDraggable={false}
                nodesConnectable={false}
                colorMode={"dark"}
                nodes={nodes}
                nodeTypes={nodeTypes}
                edges={edges}
                maxZoom={3}
                minZoom={0.1}
                onInit={(instance) => {
                    instance.fitView({
                        nodes: [
                            {
                                id: "sx4lrx3ejmxzb900z60pfw67"
                            }
                        ]
                    })
                }}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={
                        BackgroundVariant.Dots
                    }
                    gap={12}
                    size={1}
                />
            </ReactFlow>
        </div>
    )
}