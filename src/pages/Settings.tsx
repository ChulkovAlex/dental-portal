import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  KeyRound,
  Link2,
  ShieldCheck,
  Smartphone,
  UserCog,
  UsersRound,
} from 'lucide-react';

import PortalHeader from '../components/PortalHeader';
import { useAuth } from '../context/AuthContext';

interface TeamMemberConnection {
  id: number;
  name: string;
  role: string;
  telegramHandle: string;
  connected: boolean;
}

export default function Settings() {
  const { currentUser } = useAuth();

  const [profile, setProfile] = useState({
    name: currentUser?.name ?? '',
    email: currentUser?.email ?? '',
    role: currentUser?.role ?? '',
    phone: '+7',
  });
  const [notifications, setNotifications] = useState({
    scheduleUpdates: true,
    approvals: true,
    marketing: false,
    dailyDigest: true,
  });
  const [telegramBot, setTelegramBot] = useState({
    token: '',
    channel: '',
    connected: false,
    lastSync: '',
  });
  const [identIntegration, setIdentIntegration] = useState({
    apiKey: '',
    workspace: '',
    connected: false,
    lastSync: '',
  });
  const [teamConnections, setTeamConnections] = useState<TeamMemberConnection[]>([
    {
      id: 1,
      name: 'Дарья Белова',
      role: 'Администратор ресепшена',
      telegramHandle: '@daria.smile',
      connected: true,
    },
    {
      id: 2,
      name: 'Иван Денисенко',
      role: 'Врач-стоматолог',
      telegramHandle: '@dr.denis',
      connected: false,
    },
    {
      id: 3,
      name: 'Екатерина Летова',
      role: 'Ассистент',
      telegramHandle: '@kate_helper',
      connected: false,
    },
  ]);

  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [identMessage, setIdentMessage] = useState<string | null>(null);

  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      name: currentUser?.name ?? '',
      email: currentUser?.email ?? '',
      role: currentUser?.role ?? '',
    }));
  }, [currentUser]);

  const connectedCount = useMemo(
    () => teamConnections.filter((member) => member.connected).length,
    [teamConnections],
  );

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage('Настройки профиля сохранены.');
    setTimeout(() => setProfileMessage(null), 4000);
  };

  const handleTelegramSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTelegramBot((prev) => ({
      ...prev,
      connected: true,
      lastSync: new Date().toLocaleString('ru-RU'),
    }));
    setTelegramMessage('Телеграм-бот успешно подключён и синхронизирован.');
    setTimeout(() => setTelegramMessage(null), 4000);
  };

  const handleIdentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIdentIntegration((prev) => ({
      ...prev,
      connected: true,
      lastSync: new Date().toLocaleString('ru-RU'),
    }));
    setIdentMessage('Интеграция с Ident активирована.');
    setTimeout(() => setIdentMessage(null), 4000);
  };

  const toggleTeamMemberConnection = (id: number) => {
    setTeamConnections((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, connected: !member.connected } : member,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Настройки портала"
        subtitle="Управляйте личным профилем и интеграциями с коммуникационными сервисами"
      />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <section className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <form
            onSubmit={handleProfileSubmit}
            className="rounded-2xl border border-page bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <UserCog className="h-6 w-6 text-orange-500" />
              <div>
                <h2 className="text-lg font-semibold">Профиль пользователя</h2>
                <p className="text-sm text-page/60">
                  Обновите контактные данные, чтобы сотрудники знали, как с вами связаться.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                  ФИО
                </span>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="Ваше имя"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                  Электронная почта
                </span>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="email@clinic.ru"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                    Роль в системе
                  </span>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(event) => setProfile((prev) => ({ ...prev, role: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    placeholder="Администратор"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                    Рабочий телефон
                  </span>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                    placeholder="+7 (999) 000-00-00"
                  />
                </label>
              </div>

              <fieldset className="rounded-2xl border border-dashed border-page/70 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-page/60">
                  Уведомления
                </legend>
                <div className="mt-3 space-y-3 text-sm">
                  <label className="flex items-center justify-between gap-4">
                    <span>Изменения в расписании</span>
                    <input
                      type="checkbox"
                      checked={notifications.scheduleUpdates}
                      onChange={(event) =>
                        setNotifications((prev) => ({
                          ...prev,
                          scheduleUpdates: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-page text-orange-500 focus:ring-orange-400"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span>Заявки на доступ</span>
                    <input
                      type="checkbox"
                      checked={notifications.approvals}
                      onChange={(event) =>
                        setNotifications((prev) => ({
                          ...prev,
                          approvals: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-page text-orange-500 focus:ring-orange-400"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span>Маркетинговые активности</span>
                    <input
                      type="checkbox"
                      checked={notifications.marketing}
                      onChange={(event) =>
                        setNotifications((prev) => ({
                          ...prev,
                          marketing: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-page text-orange-500 focus:ring-orange-400"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span>Ежедневный дайджест в Telegram</span>
                    <input
                      type="checkbox"
                      checked={notifications.dailyDigest}
                      onChange={(event) =>
                        setNotifications((prev) => ({
                          ...prev,
                          dailyDigest: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-page text-orange-500 focus:ring-orange-400"
                    />
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-page/60">
                Последнее сохранение: {profileMessage ? 'только что' : 'не сохранено'}
              </div>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-yellow-600"
              >
                Сохранить профиль
              </button>
            </div>

            {profileMessage ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {profileMessage}
              </p>
            ) : null}
          </form>

          <div className="space-y-6">
            <div className="rounded-2xl border border-page bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <UsersRound className="h-6 w-6 text-sky-500" />
                <div>
                  <h2 className="text-lg font-semibold">Подключение команды</h2>
                  <p className="text-sm text-page/60">
                    Управляйте доступом сотрудников к Телеграм-ассистенту клиники.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                {teamConnections.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-2xl border border-page px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-page/60">{member.role}</p>
                      <p className="text-xs text-page/70">{member.telegramHandle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTeamMemberConnection(member.id)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        member.connected
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {member.connected ? 'Подключено' : 'Подключить'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-page/70 bg-card/80 px-4 py-3 text-xs text-page/60">
                Активных подключений: {connectedCount} из {teamConnections.length}
              </div>
            </div>

            <div className="rounded-2xl border border-page bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-purple-500" />
                <div>
                  <h2 className="text-lg font-semibold">Мобильный ассистент</h2>
                  <p className="text-sm text-page/60">
                    Сканируйте QR-код, чтобы быстро авторизовать сотрудника в боте клиники.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-page/60 p-6 text-center text-sm text-page/60">
                Здесь появится QR-код после подключения телеграм-бота.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleTelegramSubmit}
            className="rounded-2xl border border-page bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-sky-500" />
              <div>
                <h2 className="text-lg font-semibold">Подключение Telegram-бота</h2>
                <p className="text-sm text-page/60">
                  Укажите токен бота и канал для уведомлений, чтобы клиенты и сотрудники получали обновления.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                  Токен бота
                </span>
                <input
                  type="text"
                  value={telegramBot.token}
                  onChange={(event) => setTelegramBot((prev) => ({ ...prev, token: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="123456:ABCDEF..."
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                  Канал или чат
                </span>
                <input
                  type="text"
                  value={telegramBot.channel}
                  onChange={(event) => setTelegramBot((prev) => ({ ...prev, channel: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="@clinic_channel"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-page/60">
              <div>
                Статус: {telegramBot.connected ? 'подключено' : 'ожидает подключения'}
                <br />
                Последняя синхронизация: {telegramBot.lastSync || 'не выполнялась'}
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-sky-600 hover:to-indigo-600"
              >
                <Link2 className="h-4 w-4" />
                Сохранить подключение
              </button>
            </div>

            {telegramMessage ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {telegramMessage}
              </p>
            ) : null}
          </form>

          <form onSubmit={handleIdentSubmit} className="rounded-2xl border border-page bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              <div>
                <h2 className="text-lg font-semibold">Интеграция с Ident</h2>
                <p className="text-sm text-page/60">
                  Свяжите портал с системой идентификации Ident для безопасного управления доступами.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                  API ключ
                </span>
                <input
                  type="text"
                  value={identIntegration.apiKey}
                  onChange={(event) => setIdentIntegration((prev) => ({ ...prev, apiKey: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="IDENT-API-KEY"
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-page/60">
                  Рабочее пространство
                </span>
                <input
                  type="text"
                  value={identIntegration.workspace}
                  onChange={(event) => setIdentIntegration((prev) => ({ ...prev, workspace: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-page bg-transparent px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                  placeholder="clinic-main"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center justify-between text-xs text-page/60">
              <div>
                Статус: {identIntegration.connected ? 'активно' : 'не подключено'}
                <br />
                Последняя синхронизация: {identIntegration.lastSync || 'не выполнялась'}
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:from-emerald-600 hover:to-teal-600"
              >
                <KeyRound className="h-4 w-4" />
                Подключить Ident
              </button>
            </div>

            {identMessage ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {identMessage}
              </p>
            ) : null}
          </form>
        </section>
      </main>
    </div>
  );
}
