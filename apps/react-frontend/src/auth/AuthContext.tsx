import { createContext, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../services/authApi';

export type Role = 'Admin' | 'Author';

export type AuthState = {
  token: string | null;
  role: Role | null;
};

export type AuthContextValue = AuthState & {
  login: (token: string, role: Role) => void;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, role: null });

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: (token: string, role: Role) => setState({ token, role }),
      logout: async () => {
        const token = state.token;
        setState({ token: null, role: null });

        if (token) {
          await authApi.logout(token).catch(() => {});
        }
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
