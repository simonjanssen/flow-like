"use client";

import { useState, useCallback, useEffect } from "react";
import {
  updateUserAttributes,
  updatePassword,
  deleteUser,
  type TokenProvider,
  type AuthTokens,
  decodeJWT,
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  fetchDevices,
  fetchMFAPreference,

  type UpdateUserAttributesInput,
} from 'aws-amplify/auth';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { Amplify } from 'aws-amplify';
import { Button, useBackend, useHub, useInvoke } from "@tm9657/flow-like-ui";
import { AuthContextProps, useAuth } from "react-oidc-context";
import { useRouter } from "next/navigation";
import { ProfilePage, type ProfileFormData, type ProfileActions } from "./account";
import ChangePasswordDialog from "./change-password";
import ChangeEmailDialog from "./change-email";
import { toast } from "sonner";

class AuthTokenProvider implements TokenProvider {
  constructor(private readonly authContext: AuthContextProps) { }

  async getTokens(options?: { forceRefresh?: boolean }): Promise<AuthTokens | null> {
    if (!this.authContext.isAuthenticated || !this.authContext.user) {
      return null;
    }

    if (!this.authContext.user.access_token || !this.authContext.user.id_token) {
      return null;
    }

    const accessToken = decodeJWT(this.authContext.user?.access_token || "");
    const idToken = decodeJWT(this.authContext.user?.id_token || "");

    return {
      accessToken: accessToken,
      idToken: idToken,
    };
  }
}

const AccountPage: React.FC = () => {
  const backend = useBackend()
  const hub = useHub();
  const auth = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileFormData>({
    username: "",
    email: "",
    previewName: "",
    description: "",
    avatar: "/placeholder.webp"
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [cognito, setCognito] = useState(false);
  const info = useInvoke(backend.userState.getInfo, backend.userState, []);

  const updateUserAttribute = useCallback(async (attributeKey: string, value: string) => {
    try {
      setIsLoading(true);
      const updateInput: UpdateUserAttributesInput = {
        userAttributes: {
          [attributeKey]: value
        }
      };

      await updateUserAttributes(updateInput);

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(`Failed to update ${attributeKey}:`, error);
      toast.error(`Failed to update ${attributeKey}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  const handleChangePassword = useCallback(async () => {
    setPasswordDialogOpen(true);
  }, []);

  const handleUpdateEmail = useCallback(async (email: string) => {
    setEmailDialogOpen(true);
  }, []);



  const configureAmplify = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.profile) return;
    if (hub.hub?.authentication?.openid?.cognito?.user_pool_id) {
      const provider = new AuthTokenProvider(auth)
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolClientId: auth.settings.client_id,
            userPoolId: hub.hub.authentication.openid.cognito.user_pool_id,
          },
        },
      },
        {
          Auth: {
            tokenProvider: provider,
          },
        });

        const currentUser = await getCurrentUser();
        const attributes = await fetchUserAttributes()
        const authSession = await fetchAuthSession()
        const mfaPreferences = await fetchMFAPreference()

        console.dir({
          currentUser,
          attributes,
          authSession,
          mfaPreferences
        })

        const isFederated = Array.isArray(authSession.tokens?.idToken?.payload?.identities);
        setCognito(!isFederated);

      setProfileActions(prev => ({
        ...prev,
        changePassword: isFederated ? undefined: handleChangePassword,
        updateEmail: isFederated ? undefined: handleUpdateEmail,
      }));
    }

    loadUserData();
  }, [hub, auth.settings.client_id, auth.isAuthenticated, auth.user?.profile, auth, handleChangePassword, handleUpdateEmail]);

  const handleEmailChange = useCallback(async (newEmail: string, confirmationCode: string) => {
    try {
      await updateUserAttribute('email', newEmail);
      setProfileData(prev => ({ ...prev, email: newEmail }));
      setEmailDialogOpen(false);

      toast.success("Email updated successfully");
    } catch (error) {
      console.error('Failed to update email:', error);
      toast.error("Failed to update email");
      throw error;
    }
  }, [updateUserAttribute, toast]);

  const loadUserData = useCallback(async () => {
    if (!auth.isAuthenticated || !auth.user?.profile) return;
    setProfileData(old => ({
      ...old,
      username: auth.user?.profile?.preferred_username ?? "",
      email: auth.user?.profile?.email ?? "",
      previewName: info.data?.name ?? auth.user?.profile?.preferred_username ?? "",
      description: info.data?.description ?? "",
      avatar: info.data?.avatar ?? "/placeholder.webp"
    }));
  }, [auth.isAuthenticated, auth.user, auth.user?.profile, Amplify.getConfig, info.data]);

  useEffect(() => {
    configureAmplify();
  }, [auth.isAuthenticated, hub.hub, info.data]);


  const handleUpdateUsername = useCallback(async (username: string) => {
    await updateUserAttribute('preferred_username', username);
    auth.startSilentRenew()
    setProfileData(prev => ({ ...prev, username }));
  }, [updateUserAttribute, cognito]);

  const handleUpdatePreviewName = useCallback(async (previewName: string) => {
    await backend.userState.updateUser({
      name: previewName
    })
    setProfileData(prev => ({ ...prev, previewName }));
  }, [updateUserAttribute, cognito]);

  const handleUpdateDescription = useCallback(async (description: string) => {
    await backend.userState.updateUser({
      description: description
    })
    setProfileData(prev => ({ ...prev, description }));
  }, [updateUserAttribute, cognito]);

  const handleUpdateAvatar = useCallback(async (avatar: File) => {
    try {
      setIsLoading(true);
      await backend.userState.updateUser({}, avatar);
      setProfileData(prev => ({ ...prev, avatar: URL.createObjectURL(avatar) }));
      toast.success("Avatar updated successfully");
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast.error("Failed to upload avatar");
    } finally {
      setIsLoading(false);
    }

    await info.refetch();
  }, [auth.user?.profile?.sub, updateUserAttribute, toast]);

  const handlePasswordChange = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword
      });

      setPasswordDialogOpen(false);
      toast.success("Password updated successfully");
    } catch (error) {
      console.error('Failed to update password:', error);
      toast.error("Failed to update password");
      throw error;
    }
  }, [toast]);

  const handleViewBilling = useCallback(async () => {
    router.push('/billing');
  }, [router]);

  const handlePreviewProfile = useCallback(async () => {
    router.push(`/profile/${auth.user?.profile?.sub}`);
  }, [router, auth.user?.profile?.sub]);

  const handleSave = useCallback(async (data: ProfileFormData) => {
    try {
      setIsLoading(true);

      if(cognito && (data.username !== info.data?.preferred_username)) {
        const updates: UpdateUserAttributesInput = {
          userAttributes: {
            preferred_username: data.username,
          }
        };
        await updateUserAttributes(updates);
        await auth.clearStaleState();
        auth.signinRedirect();

      }
      await backend.userState.updateUser({
        name: data.previewName,
        description: data.description,
      });
      setProfileData(data);

      await info.refetch();
      if(cognito && (data.username !== info.data?.preferred_username)) setTimeout(async () => {
        window.location.reload();
      }, 1000);

      toast.success("Profile saved successfully");
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error("Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  }, [toast, cognito, updateUserAttributes, backend.userState, info.data]);

  const [profileActions, setProfileActions] = useState<ProfileActions>({
    updateUsername: handleUpdateUsername,
    updateEmail: undefined,
    updatePreviewName: handleUpdatePreviewName,
    updateDescription: handleUpdateDescription,
    updateAvatar: handleUpdateAvatar,
    changePassword: undefined,
    viewBilling: handleViewBilling,
    previewProfile: handlePreviewProfile
  })

  if (!auth.isAuthenticated) {
    return (
      <main className="flex flex-row items-center justify-center h-screen w-full">
        <div className="text-center p-6 border rounded-lg shadow-lg bg-card">
          <h3>Please log in to view your profile.</h3>
          <Button onClick={() => auth.signinRedirect()} className="mt-4">
            Log In
          </Button>
        </div>
      </main>
    );
  }

  return (
    <>
      <ProfilePage
        key={`${auth?.user?.profile.sub}${profileData.username}${profileData.email}`}
        initialData={profileData}
        actions={profileActions}
        isLoading={isLoading}
        onSave={handleSave}
      />

      <ChangePasswordDialog
        key={auth.user?.profile?.sub + "password"}
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        onPasswordChange={handlePasswordChange}
      />

      <ChangeEmailDialog
        key={profileData.email}
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        currentEmail={profileData.email}
        onEmailChange={handleEmailChange}
      />
    </>
  );
};

export default AccountPage;