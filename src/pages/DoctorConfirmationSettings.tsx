import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareShare,
  Settings2,
  Stethoscope,
  UserPlus2,
  Users,
} from 'lucide-react';

import PortalHeader from '../components/PortalHeader';
import {
  fetchDoctorConfirmationSettings,
  fetchTalkDoctors,
  sendNextcloudTalkBotMessage,
  updateDoctorConfirmationSettings,
  upsertTalkDoctor,
  type DoctorConfirmationSettings,
  type ScheduleConfirmationMode,
  type TalkDoctor,
} from '../services/integrationModule';

type Banner = { type: 'success' | 'error'; text: string } | null;

type DoctorForm = {
  doctorId: string;
  doctorName: string;
  doctorNcUserId: string;
  isActive: boolean;
};

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

const defaultDoctorForm: DoctorForm = {
  doctorId: '',
  doctorName: '',
  doctorNcUserId: '',
  isActive: true,
};

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
  const [doctorBanner, setDoctorBanner] = useState<Banner>(null);
  const [doctors, setDoctors] = useState<TalkDoctor[]>([]);
  const [doctorForm, setDoctorForm] = useState<DoctorForm>(defaultDoctorForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDoctor, setIsSavingDoctor] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadDoctors = async () => {
    const list = await fetchTalkDoctors();
    setDoctors(list);
  };

  useEffect(() => {
    const load = async () => {
      const loaded = await fetchDoctorConfirmationSettings();
      setSettings(loaded);
      setForm(loaded);
      await loadDoctors();
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
      setBanner({ type: 'success', text: 'Настройки подтверждения сохранены.' });
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

  const handleSaveDoctor = async () => {
    setDoctorBanner(null);

    if (!doctorForm.doctorId.trim() || !doctorForm.doctorName.trim() || !doctorForm.doctorNcUserId.trim()) {
      setDoctorBanner({
        type: 'error',
        text: 'Для врача заполните doctorId, ФИО и Nextcloud User ID.',
      });
      return;
    }

    setIsSavingDoctor(true);
    try {
      await upsertTalkDoctor({
        doctorId: doctorForm.doctorId.trim(),
        doctorName: doctorForm.doctorName.trim(),
        doctorNcUserId: doctorForm.doctorNcUserId.trim(),
        isActive: doctorForm.isActive,
      });
      await loadDoctors();
      setDoctorForm(defaultDoctorForm);
      setDoctorBanner({ type: 'success', text: 'Врач сохранён для Nextcloud Talk.' });
    } catch (error) {
      setDoctorBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Не удалось сохранить врача.',
      });
    } finally {
      setIsSavingDoctor(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Настройки Подтверждения"
        subtitle="Красивый центр управления подтверждением расписаний и уведомлениями Nextcloud Talk"
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-page bg-gradient-to-r from-indigo-500/10 via-orange-500/10 to-emerald-500/10 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
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
                <Users className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-page/60">Подключено врачей</p>
                  <p className="text-sm font-semibold text-page">{doctors.length}</p>
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
          </div>
        </section>

        <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-page bg-card p-6 shadow-lg">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Правила подтверждения</h2>
            <div className="grid gap-3">
              {modeOptions.map((mode) => (
                <label key={mode.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-page p-3 hover:border-orange-400/60">
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

            <div className="grid gap-4 lg:grid-cols-2">
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

            <div className="grid gap-4 lg:grid-cols-2">
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

          <section className="space-y-3 rounded-2xl border border-page/80 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Stethoscope className="h-5 w-5 text-teal-500" />
              Врачи для подтверждения (мультиподключение)
            </h2>

            <div className="grid gap-4 lg:grid-cols-4">
              <input
                type="text"
                placeholder="doctorId (напр. doc-001)"
                value={doctorForm.doctorId}
                onChange={(event) => setDoctorForm((prev) => ({ ...prev, doctorId: event.target.value }))}
                className="input-field"
              />
              <input
                type="text"
                placeholder="ФИО врача"
                value={doctorForm.doctorName}
                onChange={(event) => setDoctorForm((prev) => ({ ...prev, doctorName: event.target.value }))}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Nextcloud User ID"
                value={doctorForm.doctorNcUserId}
                onChange={(event) => setDoctorForm((prev) => ({ ...prev, doctorNcUserId: event.target.value }))}
                className="input-field"
              />
              <button
                type="button"
                className="btn-primary"
                disabled={isSavingDoctor}
                onClick={() => {
                  void handleSaveDoctor();
                }}
              >
                {isSavingDoctor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus2 className="mr-2 h-4 w-4" />}
                Сохранить врача
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-page/70">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-page/5 text-left">
                  <tr>
                    <th className="px-3 py-2">doctorId</th>
                    <th className="px-3 py-2">ФИО</th>
                    <th className="px-3 py-2">Nextcloud User</th>
                    <th className="px-3 py-2">Room</th>
                    <th className="px-3 py-2">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doctor) => (
                    <tr key={doctor.doctorId} className="border-t border-page/40">
                      <td className="px-3 py-2">{doctor.doctorId}</td>
                      <td className="px-3 py-2 font-medium">{doctor.doctorName}</td>
                      <td className="px-3 py-2">{doctor.doctorNcUserId}</td>
                      <td className="px-3 py-2">{doctor.roomToken ?? '—'}</td>
                      <td className="px-3 py-2">{doctor.isActive ? 'Активен' : 'Отключён'}</td>
                    </tr>
                  ))}
                  {doctors.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-page/70" colSpan={5}>
                        Пока нет подключённых врачей. Добавьте первого врача выше.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {doctorBanner ? (
              <p className={`rounded-lg px-3 py-2 text-sm ${doctorBanner.type === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                {doctorBanner.text}
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquareShare className="h-5 w-5 text-indigo-500" />
              Nextcloud Talk бот
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
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
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-page/70">Bot Token</span>
                <input
                  type="password"
                  placeholder="bot-token"
                  value={form?.botToken ?? ''}
                  onChange={(event) => updateField('botToken', event.target.value)}
                  className="input-field"
                />
              </label>
              <label className="space-y-1 text-sm lg:col-span-2">
                <span className="text-page/70">Шаблон сообщения (поддерживаются {'{date}'} и {'{pending}'})</span>
                <textarea
                  rows={3}
                  value={form?.messageTemplate ?? ''}
                  onChange={(event) => updateField('messageTemplate', event.target.value)}
                  className="input-field"
                />
              </label>
            </div>

            <div className="rounded-xl border border-page px-4 py-3 text-sm text-page/80">
              <p className="flex items-center gap-2">
                <Clock3 className="h-4 w-4" /> Последняя отправка: {formatDateTime(settings?.lastMessageAt)}
              </p>
            </div>

            {testBanner ? (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  testBanner.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : 'bg-red-500/10 text-red-700'
                }`}
              >
                {testBanner.text}
              </p>
            ) : null}
          </section>

          {banner ? (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                banner.type === 'success' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'
              }`}
            >
              {banner.text}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Сохранить настройки
            </button>
            <button type="button" className="btn-secondary" onClick={handleSendTest} disabled={!canSend || isSendingTest}>
              {isSendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
              Отправить тест в Talk
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
