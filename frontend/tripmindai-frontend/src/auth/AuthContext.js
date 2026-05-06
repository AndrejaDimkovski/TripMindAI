import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { logoutUser, me as meApi, storeAuthToken } from "../api/authApi";
import { clearToken, getToken } from "../api/http";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    const refresh = useCallback(async function refresh(silent = false) {
        if (!silent) {
            setLoading(true);
        }

        const token = getToken();
        if (!token) {
            setUser(null);
            if (!silent) {
                setLoading(false);
            }
            return false;
        }

        try {
            const currentUser = await meApi();
            setUser(mapUser(currentUser));
            return true;
        } catch {
            clearToken();
            setUser(null);
            return false;
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    const loginWithToken = useCallback(function loginWithToken(token, userPayload = null) {
        storeAuthToken(token);

        if (userPayload && userPayload.email) {
            setUser(mapUser(userPayload));
            return;
        }

        refresh(true);
    }, [refresh]);

    const logout = useCallback(async function logout() {
        try {
            await logoutUser();
        } catch {
        }

        clearToken();
        setUser(null);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        function handleAuthCleared() {
            setUser(null);
        }

        window.addEventListener("tm_auth_cleared", handleAuthCleared);
        return () => window.removeEventListener("tm_auth_cleared", handleAuthCleared);
    }, []);

    const value = useMemo(
        () => ({
            loading,
            user,
            isAuthed: Boolean(user),
            isAdmin: user?.role === "ADMIN",
            refresh,
            refreshMe: refresh,
            loginWithToken,
            logout,
        }),
        [loading, user, refresh, loginWithToken, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}

function mapUser(user) {
    return {
        id: user?.id,
        username: user?.username ?? user?.email ?? "user",
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        email: user?.email,
        role: user?.role ?? "USER",
        emailVerified: Boolean(user?.emailVerified),
        twoFactorEnabled: Boolean(user?.twoFactorEnabled),
    };
}
