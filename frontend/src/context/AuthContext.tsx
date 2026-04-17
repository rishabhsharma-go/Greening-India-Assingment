import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiGetUserName, apiLogin, apiRegister } from '../lib/api';
import { decodeJwtPayload, getTokenSubject } from '../lib/jwt';
import { clearToken, getToken, setToken } from '../lib/storage';
import type { LoginResponseDto, SignUpRequestDto } from '../lib/types';

type AuthContextValue = {
  token: string | null;
  userId: string | null;
  userName: string;
  initialized: boolean;
  isAuthenticated: boolean;
  login: (payload: SignUpRequestDto) => Promise<void>;
  register: (payload: SignUpRequestDto) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function applyToken(
  token: string,
  setUserId: (value: string | null) => void,
  setUserName: (value: string) => void
) {
  setToken(token);
  const subject = getTokenSubject(token);
  setUserId(subject);
  setUserName('User');

  if (subject) {
    try {
      const name = await apiGetUserName(subject);
      setUserName(name || 'User');
    } catch {
      const payload = decodeJwtPayload(token);
      const fallbackName =
        (payload?.name as string | undefined) ||
        (payload?.email as string | undefined) ||
        subject ||
        'User';
      setUserName(fallbackName);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('User');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const existingToken = getToken();
      if (!existingToken) {
        setInitialized(true);
        return;
      }

      setTokenState(existingToken);
      await applyToken(existingToken, setUserId, setUserName);
      setInitialized(true);
    };

    bootstrap();
  }, []);

  const login = async (payload: SignUpRequestDto) => {
    const res: LoginResponseDto = await apiLogin(payload);
    setTokenState(res.jwt);
    await applyToken(res.jwt, setUserId, setUserName);
  };

  const register = async (payload: SignUpRequestDto) => {
    const res: LoginResponseDto = await apiRegister(payload);
    setTokenState(res.jwt);
    await applyToken(res.jwt, setUserId, setUserName);
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUserId(null);
    setUserName('User');
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      userId,
      userName,
      initialized,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout
    }),
    [token, userId, userName, initialized]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
