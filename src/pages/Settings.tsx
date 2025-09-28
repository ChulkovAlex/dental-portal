import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Link2,
  Loader2,
  Plus,
  ShieldCheck,
  Smartphone,
  UserCog,
  UsersRound,
} from 'lucide-react';

import PortalHeader from '../components/PortalHeader';
import { useAuth } from '../context/AuthContext';
import {
  createPortalUser,
  fetchIdentSettings,
  fetchPortalUsers,
  fetchTelegramSettings,
  fetchUserProfile,
  type IdentAutoSyncInterval,
  type IdentIntegrationSettings,
  type IntegrationUserProfile,
  type PortalRole,
  type TelegramIntegrationSettings,
  updateIdentSettings,
  updateTelegramSettings,
  updateUserProfile,
} from '../services/integrationModule';

type MenuSection = 'users' | 'telegram' | 'ident';

interface MenuItem {
  id: MenuSection;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

type SelectedUser = number | 'new' | null;

interface UserFormState {
  name: string;
  email: string;
  role: PortalRole | string;
  phone: string;
  telegramHandle: string;
}

type BannerState = { type: 'success' | 'error'; text: string } | null;

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'users',
    label: 'Пользователи',
    description: 'Управление профилями и правами',
    icon: UsersRound,
  },
  {
    id: 'telegram',
    label: 'Телеграм',
    description: 'Уведомления и синхронизация',
    icon: Bot,
  },
  {
    id: 'ident',
    label: 'Ident',
    description: 'Интеграция с системой идентификации',
    icon: Link2,
  },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор портала',
  reception: 'Администратор ресепшена',
  doctor: 'Врач-стоматолог',
  assistant: 'Ассистент врача',
};

type IdentEntityKey = 'syncDoctors' | 'syncBranches' | 'syncSchedule' | 'syncLeads' | 'syncCalls';

const IDENT_ENTITY_OPTIONS: Array<{
  key: IdentEntityKey;
  label: string;
  description: string;
}> = [
  {
    key: 'syncDoctors',
    label: 'Справочник врачей и ассистентов',
    description: 'Импортирует карточки сотрудников и обновляет их расписание.',
  },
  {
    key: 'syncBranches',
    label: 'Филиалы клиники',
    description: 'Подтягивает адреса и кабинеты, чтобы пациентам проще было ориентироваться.',
  },
  {
    key: 'syncSchedule',
    label: 'Расписание и занятость',
    description: 'Слоты приёмов на выбранный период для отображения в портале.',
  },
  {
    key: 'syncLeads',
    label: 'Лиды и обращения',
    description: 'Позволяет контролировать маркетинговые заявки из iDent.',
  },
  {
    key: 'syncCalls',
    label: 'Статистика звонков',
    description: 'Аналитика звонков ресепшена для повышения конверсии.',
  },
];

const IDENT_AUTO_SYNC_OPTIONS: Array<{
  value: IdentAutoSyncInterval;
  label: string;
  description: string;
}> = [
  {
    value: 'manual',
    label: 'Вручную',
    description: 'Обновляйте данные по запросу администратора портала.',
  },
  {
    value: 'hourly',
    label: 'Каждый час',
    description: 'Подходит для оперативного контроля расписания и обращений.',
  },
  {
    value: 'daily',
    label: 'Ежедневно',
    description: 'Ночной обмен данными для стабильной работы портала.',
  },
];

const createEmptyUserForm = (): UserFormState => ({
  name: '',
  email: '',
  role: 'reception',
  phone: '',
  telegramHandle: '',
});

const formatDateTime = (iso?: string) => {
  if (!iso) {
    return 'не выполнялась';
  }

  try {
    return new Date(iso).toLocaleString('ru-RU');
  } catch (error) {
    console.error('Не удалось преобразовать дату синхронизации', error);
    return 'неизвестно';
  }
};

const formatUsersMeta = (count: number) => {
  if (!count) {
    return 'нет сотрудников';
  }

  if (count === 1) {
    return '1 сотрудник';
  }

  if (count < 5) {
    return `${count} сотрудника`;
  }

  return `${count} сотрудников`;
};

export default function Settings() {
  const { currentUser, refreshUsers } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  const [selectedSection, setSelectedSection] = useState<MenuSection>('users');
  const [selfProfile, setSelfProfile] = useState<IntegrationUserProfile | null>(null);
  const [users, setUsers] = useState<IntegrationUserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<SelectedUser>(null);
  const [userForm, setUserForm] = useState<UserFormState>(createEmptyUserForm);
  const [userBanner, setUserBanner] = useState<BannerState>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [telegramSettings, setTelegramSettings] = useState<TelegramIntegrationSettings | null>(null);
  const [telegramForm, setTelegramForm] = useState<TelegramIntegrationSettings | null>(null);
  const [telegramBanner, setTelegramBanner] = useState<BannerState>(null);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);

  const [identSettings, setIdentSettings] = useState<IdentIntegrationSettings | null>(null);
  const [identForm, setIdentForm] = useState<IdentIntegrationSettings | null>(null);
  const [identBanner, setIdentBanner] = useState<BannerState>(null);
  const [isSavingIdent, setIsSavingIdent] = useState(false);
  const [identBranchInput, setIdentBranchInput] = useState('');

  const refreshSelfProfile = useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    const profile = await fetchUserProfile(currentUser.id);
    if (profile) {
      setSelfProfile(profile);
      if (!isAdmin) {
        setUserForm({
          name: profile.name,
          email: profile.email,
          role: profile.role,
          phone: profile.phone ?? '',
          telegramHandle: profile.telegramHandle ?? '',
        });
      }
    }
  }, [currentUser?.id, isAdmin]);

  const reloadUsers = useCallback(async () => {
    if (!isAdmin) {
      return [] as IntegrationUserProfile[];
    }

    setIsLoadingUsers(true);
    try {
      const list = await fetchPortalUsers();
      setUsers(list);
      return list;
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    let isCancelled = false;

    const load = async () => {
      const [profile, telegram, ident] = await Promise.all([
        fetchUserProfile(currentUser.id!),
        fetchTelegramSettings(),
        fetchIdentSettings(),
      ]);

      if (isCancelled) {
        return;
      }

      if (profile) {
        setSelfProfile(profile);
        if (!isAdmin) {
          setUserForm({
            name: profile.name,
            email: profile.email,
            role: profile.role,
            phone: profile.phone ?? '',
            telegramHandle: profile.telegramHandle ?? '',
          });
        }
      }

      setTelegramSettings(telegram);
      setTelegramForm(telegram);
      setIdentSettings(ident);
      setIdentForm(ident);
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setUsers([]);
      setSelectedUserId(null);
      return;
    }

    let isCancelled = false;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      const list = await fetchPortalUsers();
      if (!isCancelled) {
        setUsers(list);
      }
      setIsLoadingUsers(false);
    };

    void loadUsers();

    return () => {
      isCancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    if (selectedUserId === null) {
      if (currentUser?.id) {
        setSelectedUserId(currentUser.id);
      } else if (users.length) {
        setSelectedUserId(users[0].id);
      }
    } else if (selectedUserId !== 'new' && users.length) {
      const exists = users.some((user) => user.id === selectedUserId);
      if (!exists) {
        setSelectedUserId(users[0]?.id ?? 'new');
      }
    }
  }, [currentUser?.id, isAdmin, selectedUserId, users]);

  useEffect(() => {
    if (isAdmin) {
      if (selectedUserId === 'new') {
        setUserForm(createEmptyUserForm());
        return;
      }

      const selectedUser = users.find((user) => user.id === selectedUserId);
      if (selectedUser) {
        setUserForm({
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role,
          phone: selectedUser.phone ?? '',
          telegramHandle: selectedUser.telegramHandle ?? '',
        });
      }
    } else if (selfProfile) {
      setUserForm({
        name: selfProfile.name,
        email: selfProfile.email,
        role: selfProfile.role,
        phone: selfProfile.phone ?? '',
        telegramHandle: selfProfile.telegramHandle ?? '',
      });
    }
  }, [isAdmin, selectedUserId, selfProfile, users]);

  useEffect(() => {
    setUserBanner(null);
  }, [isAdmin, selectedUserId]);

  useEffect(() => {
    setIdentBranchInput('');
  }, [identForm?.branchFilters]);

  const userMeta = useMemo(() => {
    if (!isAdmin) {
      return selfProfile?.email ?? '';
    }

    return formatUsersMeta(users.length);
  }, [isAdmin, selfProfile?.email, users.length]);

  const telegramMeta = useMemo(
    () => (telegramSettings?.connected ? 'подключено' : 'неактивно'),
    [telegramSettings?.connected],
  );

  const identMeta = useMemo(() => {
    if (!identSettings) {
      return 'неактивно';
    }

    if (identSettings.connected) {
      return 'подключено';
    }

    const hasBasicConfig = Boolean(
      identSettings.apiKey && identSettings.workspace && identSettings.clinicId && identSettings.branchFilters.length,
    );

    return hasBasicConfig ? 'готово к запуску' : 'неактивно';
  }, [identSettings]);

  const identAutoSyncLabel = useMemo(() => {
    if (!identSettings) {
      return '';
    }

    const option = IDENT_AUTO_SYNC_OPTIONS.find((item) => item.value === identSettings.autoSync);
    return option?.label ?? '';
  }, [identSettings]);

  const identActiveEntities = useMemo(() => {
    if (!identSettings) {
      return [] as string[];
    }

    return IDENT_ENTITY_OPTIONS.filter((option) => identSettings[option.key]).map((option) => option.label);
  }, [identSettings]);

  const handleUserFormChange = <K extends keyof UserFormState>(key: K, value: UserFormState[K]) => {
    setUserForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleIdentFormChange = <K extends keyof IdentIntegrationSettings>(
    key: K,
    value: IdentIntegrationSettings[K],
  ) => {
    setIdentForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleIdentBranchAdd = () => {
    setIdentForm((prev) => {
      if (!prev) {
        return prev;
      }

      const nextValue = identBranchInput.trim();
      if (!nextValue) {
        return prev;
      }

      if (prev.branchFilters.includes(nextValue)) {
        return prev;
      }

      return {
        ...prev,
        branchFilters: [...prev.branchFilters, nextValue],
      };
    });
    setIdentBranchInput('');
  };

  const handleIdentBranchRemove = (value: string) => {
    setIdentForm((prev) => (prev ? { ...prev, branchFilters: prev.branchFilters.filter((item) => item !== value) } : prev));
  };

  const handleIdentBranchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleIdentBranchAdd();
    }

    if (event.key === 'Backspace' && !identBranchInput) {
      setIdentForm((prev) => {
        if (!prev || !prev.branchFilters.length) {
          return prev;
        }

        const next = [...prev.branchFilters];
        next.pop();
        return { ...prev, branchFilters: next };
      });
    }
  };

  const handleIdentEntityToggle = (key: IdentEntityKey, value: boolean) => {
    setIdentForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser?.id && selectedUserId !== 'new') {
      return;
    }

    setIsSavingUser(true);
    setUserBanner(null);

    try {
      if (isAdmin) {
        if (selectedUserId === 'new') {
          const created = await createPortalUser({
            name: userForm.name,
            email: userForm.email,
            role: userForm.role,
            phone: userForm.phone,
            telegramHandle: userForm.telegramHandle,
          });
          setUserBanner({ type: 'success', text: 'Новый сотрудник добавлен в портал.' });
          const list = await reloadUsers();
          setSelectedUserId(created.id);
          if (!list.some((user) => user.id === created.id)) {
            setUsers((prev) => [...prev, created]);
          }
        } else if (typeof selectedUserId === 'number') {
          await updateUserProfile(selectedUserId, {
            name: userForm.name,
            email: userForm.email,
            role: userForm.role,
            phone: userForm.phone,
            telegramHandle: userForm.telegramHandle,
          });
          setUserBanner({ type: 'success', text: 'Профиль сотрудника обновлён.' });
          await reloadUsers();
        } else {
          throw new Error('Выберите сотрудника для редактирования.');
        }
      } else if (selfProfile) {
        const updated = await updateUserProfile(selfProfile.id, {
          name: userForm.name,
          phone: userForm.phone,
          telegramHandle: userForm.telegramHandle,
        });
        setSelfProfile(updated);
        setUserBanner({ type: 'success', text: 'Личный профиль обновлён.' });
      }

      await refreshUsers();
      await refreshSelfProfile();
    } catch (error) {
      setUserBanner({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Не удалось сохранить изменения. Попробуйте позже.',
      });
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleTelegramSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!telegramForm) {
      return;
    }

    setIsSavingTelegram(true);
    setTelegramBanner(null);

    try {
      const updated = await updateTelegramSettings({
        token: telegramForm.token,
        channel: telegramForm.channel,
        connected: true,
        syncNow: true,
      });
      setTelegramSettings(updated);
      setTelegramForm(updated);
      setTelegramBanner({ type: 'success', text: 'Телеграм-бот синхронизирован.' });
    } catch (error) {
      setTelegramBanner({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Не удалось обновить интеграцию с Телеграмом.',
      });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleTelegramDisconnect = async () => {
    setIsSavingTelegram(true);
    setTelegramBanner(null);
    try {
      const updated = await updateTelegramSettings({ connected: false });
      setTelegramSettings(updated);
      setTelegramForm(updated);
      setTelegramBanner({ type: 'success', text: 'Телеграм-бот отключён.' });
    } catch (error) {
      setTelegramBanner({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Не удалось отключить Телеграм-бот.',
      });
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const handleIdentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identForm) {
      return;
    }

    setIsSavingIdent(true);
    setIdentBanner(null);

    try {
      const updated = await updateIdentSettings({
        apiKey: identForm.apiKey,
        workspace: identForm.workspace,
        clinicId: identForm.clinicId,
        branchFilters: identForm.branchFilters,
        autoSync: identForm.autoSync,
        scheduleWindow: identForm.scheduleWindow,
        syncDoctors: identForm.syncDoctors,
        syncBranches: identForm.syncBranches,
        syncSchedule: identForm.syncSchedule,
        syncLeads: identForm.syncLeads,
        syncCalls: identForm.syncCalls,
        connected: true,
        syncNow: true,
      });
      setIdentSettings(updated);
      setIdentForm(updated);
      setIdentBanner({ type: 'success', text: 'Ident подключён и синхронизирован.' });
    } catch (error) {
      setIdentBanner({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Не удалось подключить интеграцию Ident.',
      });
    } finally {
      setIsSavingIdent(false);
    }
  };

  const handleIdentDisconnect = async () => {
    setIsSavingIdent(true);
    setIdentBanner(null);

    try {
      const updated = await updateIdentSettings({ connected: false });
      setIdentSettings(updated);
      setIdentForm(updated);
      setIdentBanner({ type: 'success', text: 'Интеграция Ident отключена.' });
    } catch (error) {
      setIdentBanner({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Не удалось отключить интеграцию Ident.',
      });
    } finally {
      setIsSavingIdent(false);
    }
  };

  const renderBanner = (banner: BannerState) => {
    if (!banner) {
      return null;
    }

    const isSuccess = banner.type === 'success';
    const icon = <CheckCircle2 className="h-4 w-4" />;
    const baseClasses = isSuccess
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';

    return (
      <p className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${baseClasses}`}>
        {icon}
        {banner.text}
      </p>
    );
  };

  const renderUsersSection = () => (
    <section className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-orange-100 p-3 text-orange-500">
          <UsersRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">
            {isAdmin ? 'Управление сотрудниками' : 'Личный профиль'}
          </h2>
          <p className="text-sm text-page/60">
            {isAdmin
              ? 'Создавайте учётные записи, назначайте права доступа и обновляйте контактные данные команды.'
              : 'Обновите контактную информацию, чтобы коллеги могли быстро связаться с вами.'}
          </p>
        </div>
      </div>

      <div className={`grid gap-6 ${isAdmin ? 'lg:grid-cols-[280px,1fr]' : ''}`}>
        {isAdmin ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedUserId('new')}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-600 transition hover:border-orange-400 hover:bg-orange-100 ${
                selectedUserId === 'new' ? 'ring-2 ring-orange-200' : ''
              }`}
            >
              <Plus className="h-4 w-4" /> Добавить сотрудника
            </button>

            <div className="space-y-2">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-page/40 bg-card/60 px-4 py-6 text-sm text-page/60">
                  Загрузка списка пользователей...
                </div>
              ) : users.length ? (
                users.map((user) => {
                  const isActive = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        isActive
                          ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm'
                          : 'border-page/40 bg-card hover:border-orange-200 hover:bg-orange-50/50'
                      }`}
                    >
                      <p className="text-sm font-semibold">
                        {user.name?.trim() || user.email}
                      </p>
                      <p className="text-xs text-page/60">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </p>
                    </button>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-page/50 bg-card/60 px-4 py-6 text-center text-sm text-page/60">
                  Пока нет добавленных сотрудников.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <form
          onSubmit={handleUserSubmit}
          className="space-y-5 rounded-2xl border border-page bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-100 p-2 text-orange-500">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {isAdmin
                  ? selectedUserId === 'new'
                    ? 'Новый сотрудник'
                    : 'Карточка сотрудника'
                  : 'Контактные данные'}
              </h3>
              <p className="text-xs text-page/60">
                {isAdmin
                  ? 'Заполните обязательные поля и сохраните изменения, чтобы применить их в портале.'
                  : 'Имя и контакты будут видеть коллеги с доступом к порталу.'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">Имя и фамилия</span>
              <input
                required
                value={userForm.name}
                onChange={(event) => handleUserFormChange('name', event.target.value)}
                placeholder="Например, Анна Петрова"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">Рабочий e-mail</span>
              <input
                required
                type="email"
                value={userForm.email}
                onChange={(event) => handleUserFormChange('email', event.target.value)}
                placeholder="name@clinic.ru"
                className={`w-full rounded-lg border px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                  isAdmin ? 'border-page/50 focus:border-orange-400' : 'border-page/30 bg-page/10'
                } ${isAdmin ? '' : 'cursor-not-allowed text-page/50'}`}
                disabled={!isAdmin || selectedUserId !== 'new'}
              />
            </label>

            {isAdmin ? (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-page/70">Права доступа</span>
                <select
                  value={userForm.role}
                  onChange={(event) => handleUserFormChange('role', event.target.value)}
                  className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="space-y-1 text-sm">
                <span className="font-medium text-page/70">Ваша роль</span>
                <input
                  value={ROLE_LABELS[userForm.role] ?? userForm.role}
                  readOnly
                  className="w-full rounded-lg border border-page/20 bg-page/5 px-4 py-3 text-sm text-page/60"
                />
              </label>
            )}

            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">Контактный телефон</span>
              <input
                value={userForm.phone}
                onChange={(event) => handleUserFormChange('phone', event.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">Телеграм</span>
              <input
                value={userForm.telegramHandle}
                onChange={(event) => handleUserFormChange('telegramHandle', event.target.value)}
                placeholder="@username"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>
          </div>

          {renderBanner(userBanner)}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSavingUser}
            >
              {isSavingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isAdmin
                ? selectedUserId === 'new'
                  ? 'Создать пользователя'
                  : 'Сохранить изменения'
                : 'Обновить профиль'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );

  const renderTelegramSection = () => (
    <section className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-sky-100 p-3 text-sky-500">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Телеграм-бот для сотрудников</h2>
          <p className="text-sm text-page/60">
            Настройте бот для отправки уведомлений о расписании, подтверждениях и служебных сообщениях.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <form
          onSubmit={handleTelegramSubmit}
          className="space-y-4 rounded-2xl border border-page bg-card p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">Bot API Token</span>
              <input
                required
                value={telegramForm?.token ?? ''}
                onChange={(event) =>
                  setTelegramForm((prev) => (prev ? { ...prev, token: event.target.value } : prev))
                }
                placeholder="Например, 123456:ABCDEF"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">Канал или чат</span>
              <input
                required
                value={telegramForm?.channel ?? ''}
                onChange={(event) =>
                  setTelegramForm((prev) => (prev ? { ...prev, channel: event.target.value } : prev))
                }
                placeholder="@clinic_schedule"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
          </div>

          {renderBanner(telegramBanner)}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-sky-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSavingTelegram}
            >
              {isSavingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Сохранить и синхронизировать
            </button>
            {telegramSettings?.connected ? (
              <button
                type="button"
                onClick={handleTelegramDisconnect}
                className="rounded-lg border border-sky-300 px-5 py-3 text-sm font-semibold text-sky-600 transition hover:border-sky-400 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingTelegram}
              >
                Отключить бот
              </button>
            ) : null}
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-page bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-page/80">
            <Smartphone className="h-4 w-4" /> Статус интеграции
          </h3>
          <div className="space-y-3 text-sm text-page/70">
            <p>
              Статус: {' '}
              <span className={telegramSettings?.connected ? 'text-emerald-600 font-semibold' : 'text-page/60'}>
                {telegramSettings?.connected ? 'активно' : 'не подключено'}
              </span>
            </p>
            <p>Канал: {telegramSettings?.channel || 'не указан'}</p>
            <p>Последняя синхронизация: {formatDateTime(telegramSettings?.lastSync)}</p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-700">
            Перед запуском убедитесь, что бот приглашён в канал и имеет права на отправку сообщений.
          </div>
        </div>
      </div>
    </section>
  );

  const renderIdentSection = () => (
    <section className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-emerald-100 p-3 text-emerald-500">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Подключение к Ident</h2>
          <p className="text-sm text-page/60">
            Подключите API iDent, чтобы оперативно получать расписание, обращения и статистику прямо в портале.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr),320px]">
        <form
          onSubmit={handleIdentSubmit}
          className="space-y-6 rounded-2xl border border-page bg-card p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">API ключ</span>
              <input
                required
                value={identForm?.apiKey ?? ''}
                onChange={(event) => handleIdentFormChange('apiKey', event.target.value)}
                placeholder="ident_xxxxxxxxx"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-page/70">Рабочее пространство</span>
              <input
                required
                value={identForm?.workspace ?? ''}
                onChange={(event) => handleIdentFormChange('workspace', event.target.value)}
                placeholder="clinic-main"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-page/70">ID клиники в iDent</span>
              <input
                required
                value={identForm?.clinicId ?? ''}
                onChange={(event) => handleIdentFormChange('clinicId', event.target.value)}
                placeholder="Например, clinic-42"
                className="w-full rounded-lg border border-page/50 bg-white px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-page/70">Филиалы для синхронизации</span>
              <span className="text-xs text-page/50">Введите код филиала и нажмите Enter</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex min-w-[220px] flex-1 flex-wrap items-center gap-2 rounded-lg border border-page/40 bg-white px-3 py-2 text-sm shadow-sm">
                {identForm?.branchFilters?.length ? (
                  identForm.branchFilters.map((branch) => (
                    <span
                      key={branch}
                      className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                    >
                      {branch}
                      <button
                        type="button"
                        onClick={() => handleIdentBranchRemove(branch)}
                        className="rounded-full bg-emerald-200 px-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-300"
                        aria-label={`Убрать филиал ${branch}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-page/50">По умолчанию будут загружены все филиалы</span>
                )}
                <input
                  value={identBranchInput}
                  onChange={(event) => setIdentBranchInput(event.target.value)}
                  onKeyDown={handleIdentBranchKeyDown}
                  placeholder="Например, main-office"
                  className="flex-1 min-w-[140px] border-none bg-transparent text-sm focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleIdentBranchAdd}
                className="rounded-lg border border-emerald-300 px-4 py-2 text-xs font-semibold text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!identBranchInput.trim()}
              >
                Добавить филиал
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-page/70">Какие данные получать из iDent</h3>
              <div className="mt-3 grid gap-3">
                {IDENT_ENTITY_OPTIONS.map((option) => {
                  const isChecked = Boolean(identForm?.[option.key]);
                  return (
                    <label
                      key={option.key}
                      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                        isChecked
                          ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800 shadow-sm'
                          : 'border-page/40 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => handleIdentEntityToggle(option.key, event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-page/40 text-emerald-500 focus:ring-emerald-400"
                      />
                      <span>
                        <span className="block font-medium">{option.label}</span>
                        <span className="mt-1 block text-xs text-page/60">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr),180px] md:items-center">
              <label className="space-y-2 text-sm">
                <span className="font-medium text-page/70">Глубина расписания (дней)</span>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={identForm?.scheduleWindow ?? 7}
                  onChange={(event) => handleIdentFormChange('scheduleWindow', Number(event.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-page/50">
                  <span>1 день</span>
                  <span>{identForm?.scheduleWindow ?? 7} дн.</span>
                  <span>30 дней</span>
                </div>
              </label>

              <div className="space-y-1 text-sm">
                <span className="font-medium text-page/70">Точное значение</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={identForm?.scheduleWindow ?? 7}
                  onChange={(event) => {
                    const rawValue = Number(event.target.value);
                    const normalized = Number.isFinite(rawValue)
                      ? Math.min(30, Math.max(1, rawValue))
                      : 1;
                    handleIdentFormChange('scheduleWindow', normalized);
                  }}
                  className="w-full rounded-lg border border-page/40 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <span className="block text-xs text-page/50">Можно указать от 1 до 30 дней вперёд</span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-page/70">Периодичность обновления данных</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {IDENT_AUTO_SYNC_OPTIONS.map((option) => {
                  const isActive = identForm?.autoSync === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex h-full cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 text-sm transition ${
                        isActive
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                          : 'border-page/40 bg-white hover:border-emerald-200 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="ident-auto-sync"
                          value={option.value}
                          checked={isActive}
                          onChange={() => handleIdentFormChange('autoSync', option.value)}
                          className="h-4 w-4 text-emerald-500 focus:ring-emerald-400"
                        />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <span className="text-xs text-page/60">{option.description}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {renderBanner(identBanner)}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSavingIdent}
            >
              {isSavingIdent ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Сохранить и подключить
            </button>
            {identSettings?.connected ? (
              <button
                type="button"
                onClick={handleIdentDisconnect}
                className="rounded-lg border border-emerald-300 px-5 py-3 text-sm font-semibold text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSavingIdent}
              >
                Отключить интеграцию
              </button>
            ) : null}
          </div>
        </form>

        <div className="space-y-4 rounded-2xl border border-page bg-card p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-page/80">
            <Link2 className="h-4 w-4" /> Статус соединения
          </h3>
          <div className="space-y-3 text-sm text-page/70">
            <p>
              Статус: {' '}
              <span className={identSettings?.connected ? 'text-emerald-600 font-semibold' : 'text-page/60'}>
                {identSettings?.connected ? 'активно' : 'не подключено'}
              </span>
            </p>
            <p>Workspace: {identSettings?.workspace || 'не указан'}</p>
            <p>ID клиники: {identSettings?.clinicId || 'не указан'}</p>
            <p>
              Филиалы:{' '}
              {identSettings?.branchFilters?.length
                ? identSettings.branchFilters.join(', ')
                : 'все филиалы'}
            </p>
            <p>
              Периодичность: {identAutoSyncLabel || 'не выбрана'}
            </p>
            <p>Глубина расписания: {identSettings?.scheduleWindow ?? 0} дн.</p>
            <p>Последняя синхронизация: {formatDateTime(identSettings?.lastSync)}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-page/50">Загружаемые данные</h4>
            <ul className="mt-2 space-y-1 text-xs text-page/70">
              {identActiveEntities.length ? (
                identActiveEntities.map((label) => (
                  <li key={label} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{label}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-center gap-2 text-page/50">
                  <span className="h-2 w-2 rounded-full bg-page/40" />
                  <span>Данные пока не выбраны</span>
                </li>
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
            После подключения портал автоматически подтянет расписание, сотрудников и обращения из iDent.
          </div>
        </div>
      </div>
    </section>
  );

  const renderSection = () => {
    switch (selectedSection) {
      case 'telegram':
        return renderTelegramSection();
      case 'ident':
        return renderIdentSection();
      case 'users':
      default:
        return renderUsersSection();
    }
  };

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Настройки портала"
        subtitle="Структурируйте профиль, уведомления и подключение внешних сервисов клиники"
      />

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
        <aside className="lg:w-72">
          <nav className="space-y-2 rounded-2xl border border-page bg-card p-3 shadow-sm">
            {MENU_ITEMS.map((item) => {
              const isActive = selectedSection === item.id;
              const meta =
                item.id === 'users'
                  ? userMeta
                  : item.id === 'telegram'
                  ? telegramMeta
                  : identMeta;

              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSection(item.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm'
                      : 'border-transparent hover:border-orange-200 hover:bg-orange-50/60'
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`rounded-full p-2 ${
                        isActive ? 'bg-orange-100 text-orange-500' : 'bg-page/10 text-page/60'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-page/60">{item.description}</span>
                    </span>
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-page/50">{meta}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1 space-y-8">{renderSection()}</section>
      </main>
    </div>
  );
}
