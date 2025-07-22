"use client";

import { useState, useCallback, useMemo } from "react";
import { User, Mail, Lock, CreditCard, Upload, Eye, Edit2 } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Textarea,
  useBackend
} from "@tm9657/flow-like-ui";

export interface ProfileFormData {
  username: string;
  email: string;
  previewName: string;
  description: string;
  avatar: string;
}

export interface ProfileActions {
  updateUsername?: (username: string) => Promise<void>;
  updateEmail?: (email: string) => Promise<void>;
  updateName?: (name: string) => Promise<void>;
  updatePreviewName?: (previewName: string) => Promise<void>;
  updateDescription?: (description: string) => Promise<void>;
  updateAvatar?: (avatar: File) => Promise<void>;
  changePassword?: () => Promise<void>;
  viewBilling?: () => Promise<void>;
  previewProfile?: () => Promise<void>;
}

interface ProfilePageProps {
  initialData: ProfileFormData;
  actions?: ProfileActions;
  isLoading?: boolean;
  onSave?: (data: ProfileFormData) => Promise<void>;
}

export function ProfilePage ({
  initialData,
  actions = {},
  isLoading = false,
  onSave
}: Readonly<ProfilePageProps>) {
  const [formData, setFormData] = useState<ProfileFormData>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return (
      formData.username !== initialData.username ||
      formData.previewName !== initialData.previewName ||
      formData.description !== initialData.description
    );
  }, [formData, initialData]);

  const handleInputChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleInlineFieldUpdate = useCallback(async (field: keyof ProfileFormData, value: any) => {
    const inlineFields = ['username', 'previewName', 'description'];
    if (!inlineFields.includes(field)) return;

    const actionMap: Record<string, keyof ProfileActions> = {
      username: 'updateUsername',
      previewName: 'updatePreviewName',
      description: 'updateDescription'
    };

    const action = actions[actionMap[field]];
    if (action) {
      await action(value);
    }
  }, [actions]);

  const handleAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && actions.updateAvatar) {
    actions.updateAvatar(file)
    }
  }, [actions.updateAvatar]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  }, [formData, onSave]);

  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  const isInlineEditable = useCallback((field: keyof ProfileFormData) => {
    const inlineFields = ['username', 'previewName', 'description'];
    const actionMap: Record<string, keyof ProfileActions> = {
      username: 'updateUsername',
      previewName: 'updatePreviewName',
      description: 'updateDescription'
    };

    return inlineFields.includes(field) && !!actions[actionMap[field]];
  }, [actions]);

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <ProfileHeader />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <AvatarCard
            avatar={formData.avatar}
            previewName={formData.previewName}
            getInitials={getInitials}
            onAvatarUpload={handleAvatarUpload}
            canEdit={!!actions.updateAvatar}
          />
        </div>

        <div className="md:col-span-2 space-y-6">
          <PersonalInfoCard
            formData={formData}
            onInputChange={handleInputChange}
            onInlineFieldUpdate={handleInlineFieldUpdate}
            onEmailClick={actions.updateEmail}
            isInlineEditable={isInlineEditable}
          />

          <SecurityCard onChangePassword={actions.changePassword} />

          <ActionButtons
            onSave={onSave ? handleSave : undefined}
            onViewBilling={actions.viewBilling}
            onPreviewProfile={actions.previewProfile}
            isLoading={isSaving || isLoading}
            hasChanges={hasChanges}
          />
        </div>
      </div>
    </div>
  );
};

const ProfileHeader: React.FC = () => (
  <div className="space-y-2">
    <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
    <p className="text-muted-foreground">
      Manage your account settings and preferences
    </p>
  </div>
);

interface AvatarCardProps {
  avatar: string;
  previewName: string;
  getInitials: (name: string) => string;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  canEdit: boolean;
}

const AvatarCard: React.FC<AvatarCardProps> = ({
  avatar,
  previewName,
  getInitials,
  onAvatarUpload,
  canEdit
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <User className="h-5 w-5" />
        Profile Picture
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatar} alt={previewName} />
          <AvatarFallback className="text-lg">
            {getInitials(previewName)}
          </AvatarFallback>
        </Avatar>

        <div className="text-center">
          <p className="font-medium">{previewName}</p>
        </div>

        {canEdit && (
          <div className="w-full">
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 rounded-md border border-dashed p-4 hover:bg-muted transition-colors">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Upload new photo</span>
              </div>
            </Label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={onAvatarUpload}
              className="hidden"
            />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

interface PersonalInfoCardProps {
  formData: ProfileFormData;
  onInputChange: (field: keyof ProfileFormData, value: string) => void;
  onInlineFieldUpdate: (field: keyof ProfileFormData, value: string) => Promise<void>;
  onEmailClick?: (email: string) => Promise<void>;
  isInlineEditable: (field: keyof ProfileFormData) => boolean;
}

const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({
  formData,
  onInputChange,
  onInlineFieldUpdate,
  onEmailClick,
  isInlineEditable
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Personal Information</CardTitle>
      <CardDescription>
        Update your personal details and profile information
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => onInputChange('username', e.target.value)}
            placeholder="Enter username"
            disabled={!isInlineEditable('username')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="previewName">Display Name</Label>
          <Input
            id="previewName"
            value={formData.previewName}
            onChange={(e) => onInputChange('previewName', e.target.value)}
            placeholder="Enter display name"
            disabled={!isInlineEditable('previewName')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            value={formData.email}
            placeholder="Enter email"
            disabled
            className="bg-muted"
          />
          {onEmailClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEmailClick(formData.email)}
              className="shrink-0"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Profile Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => onInputChange('description', e.target.value)}
          placeholder="Tell us about yourself..."
          className="min-h-[100px] resize-none"
          maxLength={2000}
          disabled={!isInlineEditable('description')}
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Maximum 2000 characters</span>
          <span>{formData.description.length}/2000</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface SecurityCardProps {
  onChangePassword?: () => Promise<void>;
}

const SecurityCard: React.FC<SecurityCardProps> = ({ onChangePassword }) => {
  if (onChangePassword) return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Lock className="h-5 w-5" />
        Security
      </CardTitle>
      <CardDescription>
        Manage your password and security settings
      </CardDescription>
    </CardHeader>
    <CardContent>
      {onChangePassword && (
        <Button variant="outline" className="w-full" onClick={onChangePassword}>
          Change Password
        </Button>
      )}
    </CardContent>
  </Card>

  return null
}

interface ActionButtonsProps {
  onSave?: () => Promise<void>;
  onViewBilling?: () => Promise<void>;
  onPreviewProfile?: () => Promise<void>;
  isLoading: boolean;
  hasChanges?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSave,
  onViewBilling,
  onPreviewProfile,
  isLoading,
  hasChanges
}) => (

  <div className="flex flex-col sm:flex-row gap-4">
    {onSave && (
      <Button onClick={onSave} disabled={isLoading || !hasChanges} className="flex-1">
        {isLoading ? "Saving..." : "Save Changes"}
      </Button>
    )}

    {(onViewBilling || onPreviewProfile) && onSave && (
      <Separator orientation="vertical" className="hidden sm:block h-auto" />
    )}

    {onViewBilling && (
      <Button variant="outline" className="flex items-center gap-2" onClick={onViewBilling}>
        <CreditCard className="h-4 w-4" />
        Billing Settings
      </Button>
    )}

    {onPreviewProfile && (
      <Button variant="outline" className="flex items-center gap-2" onClick={onPreviewProfile}>
        <Eye className="h-4 w-4" />
        Preview Profile
      </Button>
    )}
  </div>
);