import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { BellRing, Bot, CheckCircle2, Clock3, Loader2, MessageSquareShare, Settings2 } from 'lucide-react';

import PortalHeader from '../components/PortalHeader';
import {
  fetchDoctorConfirmationSettings,
  sendNextcloudTalkBotMessage,
  updateDoctorConfirmationSettings,
  type DoctorConfirmationSettings,
  type ScheduleConfirmationMode,
} from '../services/integrationModule';

type Banner = { type: 'success' | 'error'; text: string } | null;

const modeOptions: Array<{ value: ScheduleConfirmationMode; label: string; description: string }> = [
  {
    value: 'manual',
    label: 'Ручное подтверждение',
    description: 'Доктор вручную подтверждает каждый день расписания.',
  },
  {
    value: 'automatic',
    label: 'Автоматическое',
    description: 'Система подтверждает график по правилам без участия сотрудника.',
  },
  {
    value: 'hybrid',
    label: 'Гибридный режим',
    description: 'Автоматическое подтверждение с возможностью ручной корректировки.',
  },
];

const formatDateTime = (iso?: string) => {
  if (!iso) {
    return 'не отправлялось';
  }

  return new Date(iso).toLocaleString('ru-RU');
};

export default function DoctorConfirmationSettingsPage() {
  const [settings, setSettings] = useState<DoctorConfirmationSettings | null>(null);
  const [form, setForm] = useState<DoctorConfirmationSettings | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const [testBanner, setTestBanner] = useState<Banner>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    const load = async () => {
      const loaded = await fetchDoctorConfirmationSettings();
      setSettings(loaded);
      setForm(loaded);
    };

    void load();
  }, []);

  const canSend = useMemo(() => {
    if (!form) {
      return false;
    }

    return Boolean(form.nextcloudUrl.trim() && form.botToken.trim() && form.roomToken.trim());
  }, [form]);

  const updateField = <K extends keyof DoctorConfirmationSettings>(
    key: K,
    value: DoctorConfirmationSettings[K],
  ) => {
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
        nextcloudUrl: form.nextcloudUrl,
        botToken: form.botToken,
        roomToken: form.roomToken,
        messageTemplate: form.messageTemplate,
      });

      setSettings(updated);
      setForm(updated);
      setBanner({ type: 'success', text: 'Настройки подтверждения расписания сохранены.' });
    } catch (error) {
      setBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Не удалось сохранить настройки.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setTestBanner(null);

    try {
      const result = await sendNextcloudTalkBotMessage({
        dateLabel: new Date().toLocaleDateString('ru-RU'),
        pendingCount: 4,
      });

      setSettings((prev) => (prev ? { ...prev, lastMessageAt: result.sentAt, connected: true } : prev));
      setForm((prev) => (prev ? { ...prev, lastMessageAt: result.sentAt, connected: true } : prev));
      setTestBanner({ type: 'success', text: 'Тестовое сообщение отправлено в Nextcloud Talk.' });
    } catch (error) {
      setTestBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Не удалось отправить тестовое сообщение.',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Настройки подтверждения расписания"
        subtitle="Управляйте сценариями для докторов и оповещениями в Nextcloud Talk"
      />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-page/60">Режим</p>
                <p className="text-sm font-semibold text-page">{modeOptions.find((item) => item.value === settings?.mode)?.label ?? '—'}</p>
              </div>
            </div>
          </article>
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <BellRing className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-page/60">Автонапоминания</p>
                <p className="text-sm font-semibold text-page">{settings?.autoReminders ? 'включены' : 'отключены'}</p>
              </div>
            </div>
          </article>
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-sky-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-page/60">Nextcloud Talk</p>
                <p className="text-sm font-semibold text-page">{settings?.connected ? 'подключено' : 'не подключено'}</p>
              </div>
            </div>
          </article>
        </section>

        <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-page bg-card p-6 shadow-lg">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Правила подтверждения</h2>
            <div className="grid gap-3">
              {modeOptions.map((mode) => (
                <label key={mode.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-page p-3">
                  <input
                    type="radio"
                    name="mode"
                    checked={form?.mode === mode.value}
                    onChange={() => updateField('mode', mode.value)}
                    className="mt-1 accent-orange-500"
                  />
                  <span>
                    <span className="block font-medium">{mode.label}</span>
                    <span className="text-sm text-page/70">{mode.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-page p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form?.autoReminders ?? false}
                  onChange={(event) => updateField('autoReminders', event.target.checked)}
                  className="accent-orange-500"
                />
                Отправлять автонапоминания докторам
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-page p-3 text-sm">
                <input
                  type="checkbox"
                  checked={form?.requireDoctorCommentOnReject ?? false}
                  onChange={(event) => updateField('requireDoctorCommentOnReject', event.target.checked)}
                  className="accent-orange-500"
                />
                Требовать комментарий при отклонении слота
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-page/70">Напоминать за (часов)</span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={form?.reminderHoursBefore ?? 24}
                  onChange={(event) => updateField('reminderHoursBefore', Number(event.target.value) || 1)}
                  className="input-field"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-page/70">Таймаут подтверждения (минуты)</span>
                <input
                  type="number"
                  min={5}
                  max={720}
                  value={form?.approvalGraceMinutes ?? 45}
                  onChange={(event) => updateField('approvalGraceMinutes', Number(event.target.value) || 5)}
                  className="input-field"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquareShare className="h-5 w-5 text-indigo-500" />
              Nextcloud Talk бот
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-page/70">URL Nextcloud</span>
                <input
                  type="url"
                  placeholder="https://cloud.clinic.local"
                  value={form?.nextcloudUrl ?? ''}
                  onChange={(event) => updateField('nextcloudUrl', event.target.value)}
                  className="input-field"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-page/70">Room Token</span>
                <input
                  type="text"
                  placeholder="room-token"
                  value={form?.roomToken ?? ''}
                  onChange={(event) => updateField('roomToken', event.target.value)}
                  className="input-field"
                />
              </label>
            </div>
            <label className="space-y-1 text-sm block">
              <span className="text-page/70">Bot Token</span>
              <input
                type="password"
                placeholder="nc-token"
                value={form?.botToken ?? ''}
                onChange={(event) => updateField('botToken', event.target.value)}
                className="input-field"
              />
            </label>
            <label className="space-y-1 text-sm block">
              <span className="text-page/70">Шаблон сообщения (поддерживаются {`{date}`} и {`{pending}`})</span>
              <textarea
                value={form?.messageTemplate ?? ''}
                onChange={(event) => updateField('messageTemplate', event.target.value)}
                rows={3}
                className="input-field"
              />
            </label>

            <div className="rounded-xl border border-page bg-page/20 p-4 text-sm text-page/80">
              <p className="flex items-center gap-2 font-medium">
                <Clock3 className="h-4 w-4" />
                Последняя отправка: {formatDateTime(settings?.lastMessageAt)}
              </p>
            </div>
          </section>

          {banner ? (
            <p className={`rounded-xl px-4 py-3 text-sm ${banner.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {banner.text}
            </p>
          ) : null}

          {testBanner ? (
            <p className={`rounded-xl px-4 py-3 text-sm ${testBanner.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {testBanner.text}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={isSaving || !form}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Сохранить настройки
            </button>
            <button
              type="button"
              onClick={handleSendTest}
              className="inline-flex items-center rounded-xl border border-page px-4 py-2 text-sm font-semibold text-page"
              disabled={isSendingTest || !canSend}
            >
              {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Отправить тест в Talk
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
