"use client";

import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	type IBackendRole,
	Input,
	Label,
	ScrollArea,
	Switch,
	Textarea,
} from "@tm9657/flow-like-ui";
import { RolePermissions } from "@tm9657/flow-like-ui";
import { useCallback, useEffect, useState } from "react";

interface RoleDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role?: IBackendRole;
	allPermissions: RolePermissions[];
	permissionIcons: Record<
		string,
		{ icon: React.ComponentType<any>; label: string; color: string }
	>;
	onSave: (roleData: IBackendRole) => void;
}

export function RoleDialog({
	open,
	onOpenChange,
	role,
	allPermissions,
	permissionIcons,
	onSave,
}: Readonly<RoleDialogProps>) {
	const permission = new RolePermissions(role?.permissions ?? 0);
	const [formData, setFormData] = useState({
		name: "",
		description: "",
		permissions: new RolePermissions(),
		attributes: [] as string[],
		tagInput: "",
	});

	useEffect(() => {
		if (role) {
			setFormData({
				name: role.name,
				description: role.description,
				permissions: permission,
				attributes: [...(role.attributes ?? [])],
				tagInput: "",
			});
		} else {
			setFormData({
				name: "",
				description: "",
				permissions: new RolePermissions(),
				attributes: [],
				tagInput: "",
			});
		}
	}, [role, open]);

	const togglePermission = (permission: RolePermissions) => {
		// Prevent adding Owner permission if one already exists (unless editing existing owner)
		if (
			permission.equals(RolePermissions.Owner) &&
			!permission.contains(RolePermissions.Owner)
		) {
			return;
		}

		setFormData((prev) => ({
			...prev,
			permissions: prev.permissions.contains(permission)
				? prev.permissions.remove(permission)
				: prev.permissions.insert(permission),
		}));
	};

	const addTag = () => {
		if (
			formData.tagInput.trim() &&
			!formData.attributes.includes(formData.tagInput.trim())
		) {
			setFormData((prev) => ({
				...prev,
				attributes: [...prev.attributes, prev.tagInput.trim()],
				tagInput: "",
			}));
		}
	};

	const removeTag = (tagToRemove: string) => {
		setFormData((prev) => ({
			...prev,
			attributes: prev.attributes.filter((tag) => tag !== tagToRemove),
		}));
	};

	const handleSave = useCallback(() => {
		if(!role) return;
        if(!formData.name.trim()) return;

		onSave({
            ...role,
			name: formData.name,
			description: formData.description,
			permissions: formData.permissions.toBigInt(),
			attributes: formData.attributes,
		});

		onOpenChange(false);
	}, [formData, onSave, onOpenChange, role]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh]">
				<DialogHeader className="px-2">
					<DialogTitle>{role ? "Edit Role" : "Create New Role"}</DialogTitle>
					<DialogDescription>
						{role
							? "Modify the role settings and permissions"
							: "Define a new role with specific permissions and attributes"}
					</DialogDescription>
				</DialogHeader>

				<ScrollArea className="max-h-[60vh] pr-4">
					<div className="space-y-6 px-2">
						<div className="space-y-2">
							<Label htmlFor="name">Role Name</Label>
							<Input
								id="name"
								placeholder="Enter role name..."
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								placeholder="Describe what this role can do..."
								value={formData.description}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}))
								}
							/>
						</div>

						<div className="space-y-4">
							<Label>Permissions</Label>
							<div className="grid grid-cols-1 gap-3">
								{allPermissions.map((permission) => {
									const key = permission.toBigInt().toString();
									const config = permissionIcons[key];
									if (!config) return null;

									const Icon = config.icon;
									const isOwner = permission.contains(RolePermissions.Owner);

									return (
										<div
											key={key}
											className="flex items-center justify-between p-3 border rounded-lg"
										>
											<div className="flex items-center space-x-3">
												<Icon className={`h-4 w-4 ${config.color}`} />
												<div>
													<p className="font-medium">{config.label}</p>
													{isOwner && (
														<p className="text-xs text-muted-foreground">
															Can only exist once
														</p>
													)}
												</div>
											</div>
											<Switch
												checked={formData.permissions.contains(permission)}
												onCheckedChange={() => togglePermission(permission)}
												disabled={isOwner}
											/>
										</div>
									);
								})}
							</div>
						</div>

						<div className="space-y-2">
							<Label>Attributes</Label>
							<div className="flex gap-2">
								<Input
									placeholder="Add a attribute..."
									value={formData.tagInput}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											tagInput: e.target.value,
										}))
									}
									onKeyPress={(e) => e.key === "Enter" && addTag()}
								/>
								<Button onClick={addTag} variant="outline" size="sm">
									Add
								</Button>
							</div>
							{formData.attributes.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-2">
									{formData.attributes.map((tag) => (
										<Badge
											key={tag}
											variant="secondary"
											className="cursor-pointer"
											onClick={() => removeTag(tag)}
										>
											{tag} ×
										</Badge>
									))}
								</div>
							)}
						</div>
					</div>
				</ScrollArea>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={!formData.name.trim()}>
						{role ? "Save Changes" : "Create Role"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
