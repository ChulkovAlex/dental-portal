import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Stethoscope,
  Unplug,
  Users,
} from 'lucide-react';

import PortalHeader from '../components/PortalHeader';
import {
  checkNextcloudTalkConnection,
  fetchDoctorConfirmationSettings,
  fetchTalkDoctorSyncLogs,
  fetchTalkDoctors,
  syncTalkDoctorsFromNextcloud,
  updateDoctorConfirmationSettings,
  type DoctorConfirmationSettings,
  type TalkDoctor,
} from '../services/integrationModule';

type Banner = { type: 'success' | 'error'; text: string } | null;

const formatDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('ru-RU') : '—');

export default function DoctorConfirmationSettingsPage() {
  const [settings, setSettings] = useState<DoctorConfirmationSettings | null>(null);
  const [form, setForm] = useState<DoctorConfirmationSettings | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [connectionBanner, setConnectionBanner] = useState<Banner>(null);
  const [syncBanner, setSyncBanner] = useState<Banner>(null);
  const [doctors, setDoctors] = useState<TalkDoctor[]>([]);
  const [syncLogs, setSyncLogs] = useState<Array<{ status: string; message: string; created_at: string }>>([]);
  const [excludeUsersInput, setExcludeUsersInput] = useState('talkbot');
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isSyncingDoctors, setIsSyncingDoctors] = useState(false);

  const load = async () => {
    const [loadedSettings, loadedDoctors, logs] = await Promise.all([
      fetchDoctorConfirmationSettings(),
      fetchTalkDoctors(),
      fetchTalkDoctorSyncLogs(),
    ]);
    setSettings(loadedSettings);
    setForm(loadedSettings);
    setDoctors(loadedDoctors);
    setSyncLogs(logs);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = <K extends keyof DoctorConfirmationSettings>(key: K, value: DoctorConfirmationSettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    setIsSaving(true);
    setBanner(null);
    try {
      const updated = await updateDoctorConfirmationSettings({
        mode: form.mode,
        autoReminders: form.autoReminders,
        reminderHoursBefore: form.reminderHoursBefore,
        requireDoctorCommentOnReject: form.requireDoctorCommentOnReject,
        approvalGraceMinutes: form.approvalGraceMinutes,
        nextcloudBaseUrl: form.nextcloudBaseUrl,
        nextcloudServiceUser: form.nextcloudServiceUser,
        nextcloudServicePassword: form.nextcloudServicePassword,
        nextcloudBotSecret: form.nextcloudBotSecret,
        nextcloudBotId: form.nextcloudBotId,
        botServiceBaseUrl: form.botServiceBaseUrl,
        portalCallbackUrl: form.portalCallbackUrl,
        messageTemplate: form.messageTemplate,
      });
      setSettings(updated);
      setForm(updated);
      setBanner({ type: 'success', text: 'Настройки Nextcloud сохранены.' });
    } catch (error) {
      setBanner({ type: 'error', text: error instanceof Error ? error.message : 'Ошибка сохранения.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectionCheck = async () => {
    setIsCheckingConnection(true);
    setConnectionBanner(null);
    try {
      const result = await checkNextcloudTalkConnection();
      setConnectionBanner({
        type: result.ok ? 'success' : 'error',
        text: result.ok ? 'Проверка соединения успешна.' : 'Проверка соединения завершилась с ошибками.',
      });
      await load();
    } catch (error) {
      setConnectionBanner({ type: 'error', text: error instanceof Error ? error.message : 'Проверка не удалась.' });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleSyncDoctors = async () => {
    setIsSyncingDoctors(true);
    setSyncBanner(null);
    try {
      const excludeUsers = excludeUsersInput
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const result = await syncTalkDoctorsFromNextcloud({ excludeUsers });
      setSyncBanner({ type: 'success', text: `Синхронизация завершена: ${result.count} пользователей.` });
      await load();
    } catch (error) {
      setSyncBanner({ type: 'error', text: error instanceof Error ? error.message : 'Ошибка синхронизации.' });
    } finally {
      setIsSyncingDoctors(false);
    }
  };

  const connectedChecks = useMemo(() => form?.lastConnectionCheckResult ?? settings?.lastConnectionCheckResult ?? [], [form?.lastConnectionCheckResult, settings?.lastConnectionCheckResult]);

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader title="Интеграция с Nextcloud Talk" subtitle="Проверка соединения, синхронизация врачей и управление чатами" />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-page/60">Статус соединения</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4" /> {settings?.connected ? 'Успешно' : 'Не настроено'}
            </p>
          </article>
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-page/60">Последняя проверка</p>
            <p className="mt-2 text-sm font-semibold">{formatDateTime(settings?.lastConnectionCheckAt)}</p>
          </article>
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-page/60">Врачей синхронизировано</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> {doctors.length}</p>
          </article>
        </section>

        <form onSubmit={handleSave} className="space-y-4 rounded-2xl border border-page bg-card p-6 shadow-lg">
          <h2 className="text-lg font-semibold">Настройки подключения Nextcloud</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Nextcloud Base URL</span>
              <input type="url" value={form?.nextcloudBaseUrl ?? ''} onChange={(event) => updateField('nextcloudBaseUrl', event.target.value)} className="input-field" placeholder="https://cloud.example.ru" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Webhook/Base URL бота</span>
              <input type="url" value={form?.botServiceBaseUrl ?? ''} onChange={(event) => updateField('botServiceBaseUrl', event.target.value)} className="input-field" placeholder="http://127.0.0.1:18081" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Nextcloud Service User</span>
              <input type="text" value={form?.nextcloudServiceUser ?? ''} onChange={(event) => updateField('nextcloudServiceUser', event.target.value)} className="input-field" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Nextcloud Service Password / App Password</span>
              <input type="password" value={form?.nextcloudServicePassword ?? ''} onChange={(event) => updateField('nextcloudServicePassword', event.target.value)} className="input-field" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Nextcloud Bot Secret</span>
              <input type="password" value={form?.nextcloudBotSecret ?? ''} onChange={(event) => updateField('nextcloudBotSecret', event.target.value)} className="input-field" />
            </label>
            <label className="space-y-1 text-sm">
              <span>Nextcloud Bot ID</span>
              <input type="text" value={form?.nextcloudBotId ?? ''} onChange={(event) => updateField('nextcloudBotId', event.target.value)} className="input-field" />
            </label>
            <label className="space-y-1 text-sm lg:col-span-2">
              <span>Portal Callback URL (для backend бота)</span>
              <input
                type="url"
                value={form?.portalCallbackUrl ?? ''}
                onChange={(event) => updateField('portalCallbackUrl', event.target.value)}
                className="input-field"
                placeholder="https://portal.docdenisenko.ru/api/talk/schedule-response"
              />
              <p className="text-xs text-page/60">
                Не используйте localhost/127.0.0.1 для callback, если бот работает в Docker-контейнере.
              </p>
            </label>
          </div>
          {banner ? <p className={`rounded-lg px-3 py-2 text-sm ${banner.type === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>{banner.text}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Сохранить настройки
            </button>
            <button type="button" className="btn-secondary" onClick={handleConnectionCheck} disabled={isCheckingConnection}>
              {isCheckingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />} Проверить соединение
            </button>
          </div>
          {connectionBanner ? <p className={`rounded-lg px-3 py-2 text-sm ${connectionBanner.type === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>{connectionBanner.text}</p> : null}
        </form>

        <section className="space-y-3 rounded-2xl border border-page bg-card p-6 shadow-lg">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Stethoscope className="h-5 w-5" /> Синхронизация врачей из Nextcloud</h2>
          <label className="space-y-1 text-sm">
            <span>Исключить пользователей (через запятую)</span>
            <input value={excludeUsersInput} onChange={(event) => setExcludeUsersInput(event.target.value)} className="input-field" placeholder="talkbot,cloudadmin" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={handleSyncDoctors} disabled={isSyncingDoctors}>
              {isSyncingDoctors ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />} Синхронизировать врачей из Nextcloud
            </button>
          </div>
          {syncBanner ? <p className={`rounded-lg px-3 py-2 text-sm ${syncBanner.type === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>{syncBanner.text}</p> : null}
          <div className="overflow-x-auto rounded-xl border border-page/70">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-page/5 text-left">
                <tr>
                  <th className="px-3 py-2">doctorId</th>
                  <th className="px-3 py-2">doctorName</th>
                  <th className="px-3 py-2">doctorNcUserId</th>
                  <th className="px-3 py-2">roomToken</th>
                  <th className="px-3 py-2">isActive</th>
                  <th className="px-3 py-2">lastSyncAt</th>
                  <th className="px-3 py-2">lastConnectionCheckAt</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.doctorId} className="border-t border-page/40">
                    <td className="px-3 py-2">{doctor.doctorId}</td>
                    <td className="px-3 py-2 font-medium">{doctor.doctorName}</td>
                    <td className="px-3 py-2">{doctor.doctorNcUserId}</td>
                    <td className="px-3 py-2">{doctor.roomToken ?? 'не привязан'}</td>
                    <td className="px-3 py-2">{doctor.isActive ? 'Активен' : 'Отключен'}</td>
                    <td className="px-3 py-2">{formatDateTime(doctor.lastSyncAt)}</td>
                    <td className="px-3 py-2">{formatDateTime(doctor.lastConnectionCheckAt)}</td>
                  </tr>
                ))}
                {doctors.length === 0 ? (
                  <tr><td className="px-3 py-3 text-page/70" colSpan={7}>Список пуст. Нажмите «Синхронизировать врачей из Nextcloud».</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <h3 className="pt-2 text-sm font-semibold">Журнал синхронизации</h3>
          <ul className="space-y-2 rounded-xl border border-page/50 p-3 text-xs">
            {syncLogs.map((entry, index) => (
              <li key={`${entry.created_at}-${index}`} className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 ${entry.status === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {entry.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Unplug className="h-3.5 w-3.5" />} {entry.message}
                </span>
                <span className="text-page/60">{formatDateTime(entry.created_at)}</span>
              </li>
            ))}
            {syncLogs.length === 0 ? <li className="text-page/60">Журнал пуст.</li> : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-page bg-card p-6 shadow-lg">
          <h2 className="mb-3 text-lg font-semibold">Детали последней проверки соединения</h2>
          <ul className="space-y-2 text-sm">
            {connectedChecks.map((item) => (
              <li key={item.name} className={`rounded-xl border px-3 py-2 ${item.ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}>
                <p className="font-medium">{item.name}: {item.ok ? 'успешно' : 'ошибка'}</p>
                <p className="text-xs text-page/70 break-all">{typeof item.detail === 'string' ? item.detail : JSON.stringify(item.detail)}</p>
              </li>
            ))}
            {connectedChecks.length === 0 ? <li className="text-page/70">Проверка соединения ещё не выполнялась.</li> : null}
          </ul>
        </section>
      </main>
    </div>
  );
}
