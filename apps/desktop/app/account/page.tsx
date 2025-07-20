"use client";

import { useState, useCallback } from "react";
import { User, Mail, Lock, CreditCard, Upload, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Separator, Textarea } from "@tm9657/flow-like-ui";
import { useAuth } from "react-oidc-context";

interface ProfileFormData {
  username: string;
  email: string;
  name: string;
  previewName: string;
  description: string;
  avatar: string;
}

const ProfilePage: React.FC = () => {
  const auth = useAuth();
  const [formData, setFormData] = useState<ProfileFormData>({
    username: "john_doe",
    email: "john.doe@example.com",
    name: "John Doe",
    previewName: "John D.",
    description: "Software developer passionate about creating innovative solutions.",
    avatar: "/api/placeholder/150/150"
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAvatarUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  }, []);

  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }, []);

  if (!auth.isAuthenticated) {
    return <main className="flex flex-row items-center justify-center h-screen w-full">
      <div className="text-center p-6 border rounded-lg shadow-lg bg-card">
        <h3>Please log in to view your profile.</h3>
        <Button onClick={() => auth.signinRedirect()} className="mt-4">Log In</Button>
      </div>
    </main>
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <ProfileHeader />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <AvatarSection
            avatar={formData.avatar}
            name={formData.name}
            previewName={formData.previewName}
            getInitials={getInitials}
            onAvatarUpload={handleAvatarUpload}
          />
        </div>

        <div className="md:col-span-2 space-y-6">
          <PersonalInfoCard
            formData={formData}
            onInputChange={handleInputChange}
          />

          <SecurityCard />

          <ActionButtons
            onSave={handleSave}
            isLoading={isLoading}
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

interface AvatarSectionProps {
  avatar: string;
  name: string;
  previewName: string;
  getInitials: (name: string) => string;
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const AvatarSection: React.FC<AvatarSectionProps> = ({
  avatar,
  name,
  previewName,
  getInitials,
  onAvatarUpload
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
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="text-lg">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        <div className="text-center">
          <p className="font-medium">{name}</p>
          <Badge variant="secondary" className="text-xs">
            {previewName}
          </Badge>
        </div>

        <div className="w-full">
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="flex items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 p-4 hover:border-gray-400 transition-colors">
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
      </div>
    </CardContent>
  </Card>
);

interface PersonalInfoCardProps {
  formData: ProfileFormData;
  onInputChange: (field: keyof ProfileFormData, value: string) => void;
}

const PersonalInfoCard: React.FC<PersonalInfoCardProps> = ({
  formData,
  onInputChange
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
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onInputChange('email', e.target.value)}
            placeholder="Enter email"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onInputChange('name', e.target.value)}
            placeholder="Enter full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="previewName">Display Name</Label>
          <Input
            id="previewName"
            value={formData.previewName}
            onChange={(e) => onInputChange('previewName', e.target.value)}
            placeholder="Enter display name"
          />
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
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Maximum 2000 characters</span>
          <span>{formData.description.length}/2000</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SecurityCard: React.FC = () => (
  <Card>
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
      <Button variant="outline" className="w-full">
        Change Password
      </Button>
    </CardContent>
  </Card>
);

interface ActionButtonsProps {
  onSave: () => void;
  isLoading: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSave, isLoading }) => (
  <div className="flex flex-col sm:flex-row gap-4">
    <Button onClick={onSave} disabled={isLoading} className="flex-1">
      {isLoading ? "Saving..." : "Save Changes"}
    </Button>

    <Separator orientation="vertical" className="hidden sm:block h-auto" />

    <Button variant="outline" className="flex items-center gap-2">
      <CreditCard className="h-4 w-4" />
      Billing Settings
    </Button>

    <Button variant="outline" className="flex items-center gap-2">
      <Eye className="h-4 w-4" />
      Preview Profile
    </Button>
  </div>
);

export default ProfilePage;