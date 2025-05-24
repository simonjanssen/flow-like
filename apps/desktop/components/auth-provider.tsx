"use client"
import { Amplify } from 'aws-amplify';
import { AuthTokens, TokenProvider, decodeJWT } from 'aws-amplify/auth';
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getAllWindows } from "@tauri-apps/api/window";
import { INavigator, IWindow, NavigateParams, UserManager, WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts';
import { useEffect, useState } from "react";
import { AuthProvider, useAuth, hasAuthParams } from "react-oidc-context";
import { get } from "../lib/api";
import { useBackend, useInvoke } from "@tm9657/flow-like-ui";

class OIDCTokenProvider implements TokenProvider {
    constructor(private readonly userManager: UserManager) { }
    async getTokens(options?: { forceRefresh?: boolean; }): Promise<AuthTokens | null> {
        const user = await this.userManager.getUser();
        if (!user?.access_token || !user?.id_token) {
            return null;
        }

        const accessToken = decodeJWT(user.access_token);
        const idToken = decodeJWT(user.id_token);

        return {
            accessToken: accessToken,
            idToken: idToken,
        };
    }
}

class TauriWindow implements IWindow {
    private windowRef: WebviewWindow | undefined
    private abort: ((reason: Error) => void) | undefined;
    close() {
        return;
    }
    async navigate(params: NavigateParams): Promise<never> {
        if (this.windowRef) this.windowRef.close();
        const webview = new WebviewWindow("oidcFlow", {
            url: params.url,
            title: "Login",
            alwaysOnBottom: true,
            backgroundColor: "#000000",
            focus: true,
            maximized: true
        });
        const promise = new Promise((resolve, reject) => {
            this.abort = reject;
        });
        this.windowRef = webview;

        webview.onCloseRequested(() => {
            this.abort?.(new Error("User closed the window"));
            this.abort = undefined;
        })

        await webview.show();
        await webview.setFocus();
        return promise as Promise<never>
    }
}

class TauriRedirectNavigator implements INavigator {
    async prepare(params: unknown): Promise<IWindow> {
        return new TauriWindow();
    }

    async callback(url: string, params?: unknown): Promise<void> {
        return;
    }
}

export function DesktopAuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [openIdAuthConfig, setOpenIdAuthConfig] = useState<UserManagerSettings>()
    const [userManager, setUserManager] = useState<UserManager>();
    const backend = useBackend()
    const currentProfile = useInvoke(backend.getSettingsProfile, []);
    const auth = useAuth();

    useEffect(() => {
        (async () => {
            const response = await get<any>("auth/openid");
            if (response) {
                if (process.env.NEXT_PUBLIC_REDIRECT_URL) response.redirect_uri = process.env.NEXT_PUBLIC_REDIRECT_URL
                if (process.env.NEXT_PUBLIC_REDIRECT_LOGOUT_URL) response.post_logout_redirect_uri = process.env.NEXT_PUBLIC_REDIRECT_LOGOUT_URL
                const store = new WebStorageStateStore({
                    store: localStorage,
                });
                response.userStore = store;
                response.automaticSilentRenew = true;
                const navigator = new TauriRedirectNavigator();
                const userManagerInstance = new UserManager(response, navigator);
                response.userManager = userManagerInstance;
                const tokenProvider = new OIDCTokenProvider(userManagerInstance);
                if(response.cognito) Amplify.configure({
                    Auth: {
                        Cognito: {
                            userPoolClientId: response.client_id,
                            userPoolId: response.cognito.user_pool_id,
                        }
                    }
                }, {
                    Auth: {
                        tokenProvider: tokenProvider,
                    }
                });
                setUserManager(userManagerInstance);
                setOpenIdAuthConfig(response)
            }
        })()
    }, [])

    useEffect(() => {
        if (!openIdAuthConfig) return;

        const unlisten = listen<{ url: string }>("oidc/url", async (event) => {
            const url = event.payload.url;
            if (url.startsWith(openIdAuthConfig.redirect_uri)) {
                await userManager?.signinRedirectCallback(event.payload.url)
                const windows = await getAllWindows();
                for (const window of windows) {
                    if (window.label === "oidcFlow") {
                        window.close();
                    }
                }
            }

            if (openIdAuthConfig.post_logout_redirect_uri && url.startsWith(openIdAuthConfig.post_logout_redirect_uri)) {
                const windows = await getAllWindows();
                for (const window of windows) {
                    if (window.label === "oidcFlow") {
                        window.close();
                    }
                }
            }

            if (url.includes("/login?id_token_hint=")) {
                const windows = await getAllWindows();
                for (const window of windows) {
                    if (window.label === "oidcFlow") {
                        window.close();
                    }
                }
            }
        });

        auth?.signinSilent()

        return () => {
            unlisten.then(unsub => unsub());
        }
    }, [userManager, openIdAuthConfig, auth]);

    if (!openIdAuthConfig) return children

    return <AuthProvider {...openIdAuthConfig} automaticSilentRenew={true} userStore={new WebStorageStateStore({
        store: localStorage,
    })}>
        {children}
    </AuthProvider>;
}