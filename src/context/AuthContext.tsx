import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bcrypt from 'bcryptjs';

import { AuthUser, authDb, authDbReady } from '../services/authDb';

export type AuthErrorCode = 'user-not-found' | 'invalid-password' | 'needs-password-setup';

export class AuthError extends Error {
  public code: AuthErrorCode;
  public user?: AuthUser;

  constructor(code: AuthErrorCode, message: string, user?: AuthUser) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.user = user;
  }
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  users: AuthUser[];
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  completeAdminSetup: (userId: number, password: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'dental-portal-active-user';

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    await authDbReady;
    const allUsers = await authDb.users.toArray();
    setUsers(allUsers);
    return allUsers;
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const allUsers = await loadUsers();
      const storedId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedId) {
        const parsedId = Number(storedId);
        if (!Number.isNaN(parsedId)) {
          const savedUser = allUsers.find((user) => user.id === parsedId);
          if (savedUser) {
            setCurrentUser(savedUser);
          } else {
            localStorage.removeItem(SESSION_STORAGE_KEY);
          }
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
      setLoading(false);
    };

    void initialize();
  }, [loadUsers]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authDbReady;
      const normalizedEmail = email.trim().toLowerCase();
      const user = await authDb.users.where('email').equals(normalizedEmail).first();
      if (!user) {
        throw new AuthError('user-not-found', 'Пользователь не найден');
      }

      if (user.needsPasswordSetup) {
        throw new AuthError('needs-password-setup', 'Требуется первичная установка пароля', user);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AuthError('invalid-password', 'Неверный пароль');
      }

      setCurrentUser(user);
      if (typeof user.id === 'number') {
        localStorage.setItem(SESSION_STORAGE_KEY, String(user.id));
      }

      return user;
    },
    [],
  );

  const completeAdminSetup = useCallback(
    async (userId: number, password: string) => {
      await authDbReady;
      const existingUser = await authDb.users.get(userId);
      if (!existingUser) {
        throw new AuthError('user-not-found', 'Пользователь не найден');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await authDb.users.update(userId, {
        passwordHash,
        needsPasswordSetup: false,
      });

      const allUsers = await loadUsers();
      const updatedUser = allUsers.find((user) => user.id === userId);
      if (!updatedUser) {
        throw new AuthError('user-not-found', 'Пользователь не найден');
      }

      setCurrentUser(updatedUser);
      localStorage.setItem(SESSION_STORAGE_KEY, String(userId));

      return updatedUser;
    },
    [loadUsers],
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      users,
      loading,
      login,
      logout,
      completeAdminSetup,
    }),
    [completeAdminSetup, currentUser, loading, login, logout, users],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};
