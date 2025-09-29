import bcrypt from 'bcryptjs';

import { authDb, authDbReady, type AuthUser } from './authDb';

export type PortalRole = 'admin' | 'reception' | 'doctor' | 'assistant';

export interface IntegrationUserProfile {
  id: number;
  name: string;
  email: string;
  role: PortalRole | string;
  phone?: string;
  telegramHandle?: string;
}

export interface IdentLogEntry {
  timestamp: string;
  source: string;
  message: string;
}

export interface TelegramIntegrationSettings {
  token: string;
  channel: string;
  connected: boolean;
  lastSync?: string;
}

export type IdentAutoSyncInterval = 'manual' | 'hourly' | 'daily';

export interface IdentIntegrationSettings {
  host: string;
  port: string;
  username: string;
  password: string;
  autoSync: IdentAutoSyncInterval;
  scheduleWindow: number;
  syncDoctors: boolean;
  syncBranches: boolean;
  syncSchedule: boolean;
  syncLeads: boolean;
  syncCalls: boolean;
  connected: boolean;
  lastSync?: string;
}

interface IntegrationSettingsState {
  userExtensions: Record<string, { phone?: string; telegramHandle?: string }>;
  telegram: TelegramIntegrationSettings;
  ident: IdentIntegrationSettings;
  identLogs: IdentLogEntry[];
}

const STORAGE_KEY = 'dental-portal-integration-settings';
const MAX_IDENT_LOG_ENTRIES = 100;

const defaultState: IntegrationSettingsState = {
  userExtensions: {},
  telegram: {
    token: '',
    channel: '',
    connected: false,
    lastSync: undefined,
  },
  ident: {
    host: '',
    port: '',
    username: '',
    password: '',
    autoSync: 'manual',
    scheduleWindow: 7,
    syncDoctors: true,
    syncBranches: true,
    syncSchedule: true,
    syncLeads: false,
    syncCalls: false,
    connected: false,
    lastSync: undefined,
  },
  identLogs: [],
};

let cachedState: IntegrationSettingsState | null = null;

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.error('Не удалось получить доступ к localStorage', error);
    return null;
  }
};

const cloneState = (state: IntegrationSettingsState): IntegrationSettingsState => ({
  userExtensions: { ...state.userExtensions },
  telegram: { ...state.telegram },
  ident: { ...state.ident },
  identLogs: state.identLogs.map((entry) => ({ ...entry })),
});

const sanitizeIdentLogEntry = (entry: unknown): IdentLogEntry | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Partial<Record<keyof IdentLogEntry, unknown>>;
  const timestamp = typeof candidate.timestamp === 'string' && candidate.timestamp ? candidate.timestamp : null;
  const source = typeof candidate.source === 'string' && candidate.source ? candidate.source : null;
  const message = typeof candidate.message === 'string' && candidate.message ? candidate.message : null;

  if (!timestamp || !source || !message) {
    return null;
  }

  return { timestamp, source, message } satisfies IdentLogEntry;
};

const enforceLogLimit = (entries: IdentLogEntry[]): IdentLogEntry[] =>
  entries.slice(-MAX_IDENT_LOG_ENTRIES).map((entry) => ({ ...entry }));

const loadState = (): IntegrationSettingsState => {
  const storage = getStorage();
  if (!storage) {
    return cloneState(defaultState);
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneState(defaultState);
    }

    const parsed = JSON.parse(raw) as Partial<IntegrationSettingsState>;
    if (!parsed || typeof parsed !== 'object') {
      return cloneState(defaultState);
    }

    const identLogs = Array.isArray(parsed.identLogs)
      ? parsed.identLogs
          .map((entry) => sanitizeIdentLogEntry(entry))
          .filter((entry): entry is IdentLogEntry => Boolean(entry))
      : [];

    return {
      userExtensions: typeof parsed.userExtensions === 'object' && parsed.userExtensions
        ? parsed.userExtensions
        : {},
      telegram: {
        ...defaultState.telegram,
        ...(parsed.telegram ?? {}),
      },
      ident: {
        ...defaultState.ident,
        ...(parsed.ident ?? {}),
        host: typeof parsed.ident?.host === 'string' ? parsed.ident.host : defaultState.ident.host,
        port: typeof parsed.ident?.port === 'string' ? parsed.ident.port : defaultState.ident.port,
        username:
          typeof parsed.ident?.username === 'string' ? parsed.ident.username : defaultState.ident.username,
        password:
          typeof parsed.ident?.password === 'string' ? parsed.ident.password : defaultState.ident.password,
      },
      identLogs: enforceLogLimit(identLogs),
    } satisfies IntegrationSettingsState;
  } catch (error) {
    console.error('Не удалось загрузить настройки интеграции', error);
    return cloneState(defaultState);
  }
};

const writeState = (state: IntegrationSettingsState) => {
  const normalized: IntegrationSettingsState = {
    ...state,
    identLogs: enforceLogLimit(state.identLogs),
  };

  cachedState = cloneState(normalized);
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.error('Не удалось сохранить настройки интеграции', error);
  }
};

const readState = (): IntegrationSettingsState => {
  if (!cachedState) {
    cachedState = loadState();
  }
  return cloneState(cachedState);
};

const updateState = (
  updater: (state: IntegrationSettingsState) => IntegrationSettingsState | void,
): IntegrationSettingsState => {
  const draft = readState();
  const result = updater(draft);
  const next = result ?? draft;
  writeState(next);
  return next;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mapUser = (
  user: AuthUser,
  extensions: IntegrationSettingsState['userExtensions'],
): IntegrationUserProfile | null => {
  if (typeof user.id !== 'number') {
    return null;
  }

  const extension = extensions[String(user.id)] ?? {};

  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email,
    role: user.role,
    phone: extension.phone,
    telegramHandle: extension.telegramHandle,
  } satisfies IntegrationUserProfile;
};

export const fetchPortalUsers = async (): Promise<IntegrationUserProfile[]> => {
  await authDbReady;
  const [users, state] = await Promise.all([authDb.users.toArray(), Promise.resolve(readState())]);
  return users
    .map((user) => mapUser(user, state.userExtensions))
    .filter((user): user is IntegrationUserProfile => Boolean(user))
    .sort((a, b) => {
      const nameA = a.name?.trim() || a.email;
      const nameB = b.name?.trim() || b.email;
      return nameA.localeCompare(nameB, 'ru');
    });
};

export const fetchUserProfile = async (
  userId: number,
): Promise<IntegrationUserProfile | null> => {
  const users = await fetchPortalUsers();
  return users.find((user) => user.id === userId) ?? null;
};

export interface UpdateUserProfilePayload {
  name?: string;
  email?: string;
  role?: PortalRole | string;
  phone?: string;
  telegramHandle?: string;
}

export const updateUserProfile = async (
  userId: number,
  updates: UpdateUserProfilePayload,
): Promise<IntegrationUserProfile> => {
  await authDbReady;

  const dbUpdates: Partial<AuthUser> = {};

  if (typeof updates.name === 'string') {
    const trimmedName = updates.name.trim();
    dbUpdates.name = trimmedName ? trimmedName : undefined;
  }

  if (typeof updates.email === 'string') {
    dbUpdates.email = normalizeEmail(updates.email);
  }

  if (typeof updates.role === 'string') {
    dbUpdates.role = updates.role;
  }

  if (Object.keys(dbUpdates).length > 0) {
    await authDb.users.update(userId, dbUpdates);
  }

  updateState((state) => {
    const extension = { ...(state.userExtensions[String(userId)] ?? {}) };

    if (typeof updates.phone === 'string') {
      const trimmedPhone = updates.phone.trim();
      if (trimmedPhone) {
        extension.phone = trimmedPhone;
      } else {
        delete extension.phone;
      }
    }

    if (typeof updates.telegramHandle === 'string') {
      const trimmedHandle = updates.telegramHandle.trim();
      if (trimmedHandle) {
        extension.telegramHandle = trimmedHandle;
      } else {
        delete extension.telegramHandle;
      }
    }

    state.userExtensions[String(userId)] = extension;
  });

  const updatedProfile = await fetchUserProfile(userId);
  if (!updatedProfile) {
    throw new Error('Пользователь не найден после обновления профиля');
  }

  return updatedProfile;
};

export interface CreatePortalUserPayload {
  name: string;
  email: string;
  role: PortalRole | string;
  phone?: string;
  telegramHandle?: string;
  password?: string;
  requirePasswordSetup?: boolean;
}

export const createPortalUser = async (
  payload: CreatePortalUserPayload,
): Promise<IntegrationUserProfile> => {
  await authDbReady;

  const normalizedEmail = normalizeEmail(payload.email);
  const existingUser = await authDb.users.where('email').equals(normalizedEmail).first();
  if (existingUser) {
    throw new Error('Пользователь с таким e-mail уже существует в портале');
  }

  const trimmedName = payload.name.trim();
  const needsPasswordSetup = payload.requirePasswordSetup ?? !payload.password;
  const passwordHash = payload.password ? await bcrypt.hash(payload.password, 10) : '';

  const userId = await authDb.users.add({
    email: normalizedEmail,
    passwordHash,
    role: payload.role,
    needsPasswordSetup,
    name: trimmedName ? trimmedName : undefined,
  });

  updateState((state) => {
    const extension: { phone?: string; telegramHandle?: string } = {};

    if (payload.phone?.trim()) {
      extension.phone = payload.phone.trim();
    }

    if (payload.telegramHandle?.trim()) {
      extension.telegramHandle = payload.telegramHandle.trim();
    }

    state.userExtensions[String(userId)] = extension;
  });

  const profile = await fetchUserProfile(userId);
  if (!profile) {
    throw new Error('Не удалось получить данные созданного пользователя');
  }

  return profile;
};

export const fetchTelegramSettings = async (): Promise<TelegramIntegrationSettings> => {
  const state = readState();
  return { ...state.telegram };
};

export interface UpdateTelegramSettingsPayload {
  token?: string;
  channel?: string;
  connected?: boolean;
  syncNow?: boolean;
}

export const updateTelegramSettings = async (
  updates: UpdateTelegramSettingsPayload,
): Promise<TelegramIntegrationSettings> => {
  const next = updateState((state) => {
    const telegram = { ...state.telegram };

    if (typeof updates.token === 'string') {
      telegram.token = updates.token.trim();
    }

    if (typeof updates.channel === 'string') {
      telegram.channel = updates.channel.trim();
    }

    if (typeof updates.connected === 'boolean') {
      telegram.connected = updates.connected;
      telegram.lastSync = updates.connected ? new Date().toISOString() : undefined;
    }

    if (updates.syncNow) {
      telegram.lastSync = new Date().toISOString();
      telegram.connected = Boolean(telegram.token && telegram.channel);
    }

    state.telegram = telegram;
    return state;
  });

  return { ...next.telegram };
};

export const fetchIdentSettings = async (): Promise<IdentIntegrationSettings> => {
  const state = readState();
  return { ...state.ident };
};

export interface UpdateIdentSettingsPayload {
  host?: string;
  port?: string | number;
  username?: string;
  password?: string;
  autoSync?: IdentAutoSyncInterval;
  scheduleWindow?: number;
  syncDoctors?: boolean;
  syncBranches?: boolean;
  syncSchedule?: boolean;
  syncLeads?: boolean;
  syncCalls?: boolean;
  connected?: boolean;
  syncNow?: boolean;
}

export const updateIdentSettings = async (
  updates: UpdateIdentSettingsPayload,
): Promise<IdentIntegrationSettings> => {
  const next = updateState((state) => {
    const ident = { ...state.ident };

    if (typeof updates.host === 'string') {
      ident.host = updates.host.trim();
    }

    if (typeof updates.port === 'string' || typeof updates.port === 'number') {
      const portValue = typeof updates.port === 'number' ? String(Math.trunc(updates.port)) : updates.port;
      ident.port = portValue.trim();
    }

    if (typeof updates.username === 'string') {
      ident.username = updates.username.trim();
    }

    if (typeof updates.password === 'string') {
      ident.password = updates.password;
    }

    if (typeof updates.autoSync === 'string') {
      const allowed: IdentAutoSyncInterval[] = ['manual', 'hourly', 'daily'];
      if (allowed.includes(updates.autoSync as IdentAutoSyncInterval)) {
        ident.autoSync = updates.autoSync as IdentAutoSyncInterval;
      }
    }

    if (typeof updates.scheduleWindow === 'number' && Number.isFinite(updates.scheduleWindow)) {
      const clamped = Math.round(Math.max(1, Math.min(30, updates.scheduleWindow)));
      ident.scheduleWindow = clamped;
    }

    if (typeof updates.syncDoctors === 'boolean') {
      ident.syncDoctors = updates.syncDoctors;
    }

    if (typeof updates.syncBranches === 'boolean') {
      ident.syncBranches = updates.syncBranches;
    }

    if (typeof updates.syncSchedule === 'boolean') {
      ident.syncSchedule = updates.syncSchedule;
    }

    if (typeof updates.syncLeads === 'boolean') {
      ident.syncLeads = updates.syncLeads;
    }

    if (typeof updates.syncCalls === 'boolean') {
      ident.syncCalls = updates.syncCalls;
    }

    if (typeof updates.connected === 'boolean') {
      ident.connected = updates.connected;
      ident.lastSync = updates.connected ? new Date().toISOString() : undefined;
    }

    if (updates.syncNow) {
      ident.lastSync = new Date().toISOString();
      ident.connected = Boolean(ident.host && ident.port && ident.username && ident.password);
    }

    state.ident = { ...ident };
    return state;
  });

  return { ...next.ident };
};

export const fetchIdentLogs = async (): Promise<IdentLogEntry[]> => {
  const state = readState();
  return state.identLogs.map((entry) => ({ ...entry }));
};

const sanitizeLogInput = (entry: IdentLogEntry): IdentLogEntry => {
  const timestamp = typeof entry.timestamp === 'string' && entry.timestamp ? entry.timestamp : new Date().toISOString();
  const source = entry.source ? String(entry.source).trim() : 'unknown';
  const message = entry.message ? String(entry.message).trim() : 'Неизвестная ошибка';

  return {
    timestamp,
    source,
    message,
  } satisfies IdentLogEntry;
};

export const appendIdentLog = async (entry: IdentLogEntry): Promise<void> => {
  const normalized = sanitizeLogInput(entry);
  updateState((state) => {
    state.identLogs = enforceLogLimit([...state.identLogs, normalized]);
  });
};

export const clearIdentLogs = async (): Promise<void> => {
  updateState((state) => {
    state.identLogs = [];
  });
};
