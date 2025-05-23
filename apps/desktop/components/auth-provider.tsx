"use client"

import { useEffect, useState } from "react";
import { get } from "../lib/api";
import { AuthProvider, AuthProviderProps } from "react-oidc-context";

export function DesktopAuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [cognitoAuthConfig, setCognitoAuthConfig] = useState<AuthProviderProps>()

    useEffect(() => {
        (async () => {
            const response = await get<any>("auth/openid");
            if (response) {
                response.redirect_uri = "flow-like://auth/callback"
                setCognitoAuthConfig(response)
            }
        })()
    }, [])

    if(!cognitoAuthConfig) return children


    return <AuthProvider {...cognitoAuthConfig} >
            {children}
        </AuthProvider>;
}