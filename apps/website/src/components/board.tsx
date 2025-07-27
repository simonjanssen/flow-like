import { Background, BackgroundVariant, ReactFlow } from "@tm9657/flow-like-ui";
import { CommentNode } from "@tm9657/flow-like-ui/components/flow/comment-node";
import { FlowNode } from "@tm9657/flow-like-ui/components/flow/flow-node";
import { LayerNode } from "@tm9657/flow-like-ui/components/flow/layer-node";
import { useEffect, useMemo, useState } from "react";

export function Board({
	nodes,
	edges,
}: Readonly<{ nodes: any[]; edges: any[] }>) {
	const nodeTypes = useMemo(
		() => ({
			flowNode: FlowNode,
			commentNode: CommentNode,
			layerNode: LayerNode,
			node: FlowNode,
		}),
		[],
	);

	const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
	useEffect(() => {
		const update = () => setIsMobile(window.innerWidth <= 768);
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

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
						nodes: isMobile
							? [
									{
										id: "u7urfocffhjtbwdwlore8u4w",
									},
								]
							: [
									{
										id: "u7urfocffhjtbwdwlore8u4w",
									},
								],
					});
				}}
				proOptions={{ hideAttribution: true }}
			>
				<Background variant={BackgroundVariant.Dots} gap={12} size={1} />
			</ReactFlow>
		</div>
	);
}
