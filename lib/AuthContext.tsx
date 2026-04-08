import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import * as api from "./api";

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string, language?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Token storage helpers (SecureStore on native, localStorage on web)
async function saveToken(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getToken(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteToken(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    accessToken: null,
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleTokens = useCallback(async (data: api.AuthResponse) => {
    await saveToken("access_token", data.access_token);
    await saveToken("refresh_token", data.refresh_token);
    setState({ isLoading: false, isAuthenticated: true, accessToken: data.access_token });

    // Schedule refresh 60s before expiry
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const refreshIn = Math.max((data.expires_in - 60) * 1000, 10000);
    refreshTimerRef.current = setTimeout(doRefresh, refreshIn);
  }, []);

  const doRefresh = useCallback(async () => {
    try {
      const token = await getToken("refresh_token");
      if (!token) throw new Error("No refresh token");
      const data = await api.refreshToken(token);
      await handleTokens(data);
    } catch {
      await clearAuth();
    }
  }, [handleTokens]);

  const clearAuth = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    await deleteToken("access_token");
    await deleteToken("refresh_token");
    setState({ isLoading: false, isAuthenticated: false, accessToken: null });
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    (async () => {
      const token = await getToken("access_token");
      const refresh = await getToken("refresh_token");
      if (token && refresh) {
        setState({ isLoading: false, isAuthenticated: true, accessToken: token });
        // Try refreshing to validate the token
        doRefresh();
      } else {
        setState({ isLoading: false, isAuthenticated: false, accessToken: null });
      }
    })();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    await handleTokens(data);
  }, [handleTokens]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string, language?: string) => {
    const data = await api.register(email, password, fullName, language);
    await handleTokens(data);
  }, [handleTokens]);

  const signOut = useCallback(async () => {
    try {
      const token = await getToken("access_token");
      if (token) await api.logout(token);
    } catch { /* ignore */ }
    await clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
