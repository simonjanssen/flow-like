"use client";

import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Textarea,
} from "../ui";

export function CommentDialog({
	open,
	onOpenChange,
	comment,
	onUpsert,
}: Readonly<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
	comment: string;
	onUpsert: (comment: string) => void;
}>) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Comment</DialogTitle>
					<DialogDescription>Add a comment to the node.</DialogDescription>
				</DialogHeader>
				<DialogDescription>
					<Textarea
						value={comment}
						rows={6}
						onChange={(e) => onUpsert(e.target.value)}
					/>
				</DialogDescription>
				<DialogFooter>
					<Button
						className="w-full"
						onClick={() => {
							onOpenChange(false);
						}}
					>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
