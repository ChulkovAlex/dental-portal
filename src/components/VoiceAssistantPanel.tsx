import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Headphones,
  Mic,
  PhoneCall,
  RefreshCcw,
  Volume2,
} from 'lucide-react';

import { appointmentStatusMeta } from '../constants/appointmentStatus';
import { useSchedule } from '../context/ScheduleContext';
import type { CallTask } from '../data/schedule';
import { tomorrowKey } from '../data/schedule';
import { addMinutesToTime, formatDateHuman } from '../utils/date';

const callStatusOrder: CallTask['status'][] = [
  'calling',
  'pending',
  'no-answer',
  'reschedule',
  'confirmed',
];

const statusBadge: Record<CallTask['status'], { label: string; className: string }> = {
  pending: {
    label: 'Ожидает звонка',
    className: 'border border-dashed border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  },
  calling: {
    label: 'Соединение…',
    className: 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-100',
  },
  confirmed: {
    label: 'Пациент подтвердил',
    className: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100',
  },
  reschedule: {
    label: 'Просит перенести',
    className: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100',
  },
  'no-answer': {
    label: 'Не дозвонились',
    className: 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100',
  },
};

const scriptSteps = [
  'Добрый день! Вас беспокоит клиника доктора Денисенко. Напоминаю о приёме завтра.',
  'Пожалуйста, подтвердите, сможете ли прийти в назначенное время. Если нет — подберём удобный слот.',
  'Уточните, есть ли противопоказания или пожелания. Напомните взять документы и средства оплаты.',
  'Поблагодарите за ответ и завершите звонок с пожеланием хорошего дня.',
];

type CallOutcome = Exclude<CallTask['status'], 'pending' | 'calling'>;

export default function VoiceAssistantPanel() {
  const { appointments, doctors, callTasks, startCall, finishCall } = useSchedule();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const tasks = useMemo(() => {
    return callTasks
      .filter((task) => task.scheduledFor.startsWith(tomorrowKey))
      .sort((a, b) => {
        const statusDiff = callStatusOrder.indexOf(a.status) - callStatusOrder.indexOf(b.status);
        if (statusDiff !== 0) return statusDiff;
        return a.scheduledFor.localeCompare(b.scheduledFor);
      });
  }, [callTasks]);

  const appointmentMap = useMemo(
    () => new Map(appointments.map((appointment) => [appointment.id, appointment])),
    [appointments],
  );

  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors],
  );

  const totals = useMemo(() => {
    const summary = {
      total: tasks.length,
      confirmed: tasks.filter((task) => task.status === 'confirmed').length,
      waiting: tasks.filter((task) => task.status === 'pending' || task.status === 'calling').length,
      escalation: tasks.filter((task) => task.status === 'reschedule' || task.status === 'no-answer').length,
    };
    return summary;
  }, [tasks]);

  const handleStartCall = (taskId: string) => {
    startCall(taskId);
    setErrors((prev) => ({ ...prev, [taskId]: undefined }));
  };

  const handleOutcome = (task: CallTask, outcome: CallOutcome) => {
    const noteValue = notes[task.id] ?? task.note ?? '';
    if (outcome === 'reschedule' && noteValue.trim().length === 0) {
      setErrors((prev) => ({ ...prev, [task.id]: 'Укажите желаемое время или причину переноса.' }));
      return;
    }
    finishCall(task.id, outcome, noteValue);
    setErrors((prev) => ({ ...prev, [task.id]: undefined }));
  };

  const tomorrowLabel = formatDateHuman(tomorrowKey, {
    day: 'numeric',
    month: 'long',
  });

  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Голосовой ассистент</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Звонки пациентам на {tomorrowLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SummaryBadge icon={<Volume2 className="h-4 w-4" />}>
              Всего: {totals.total}
            </SummaryBadge>
            <SummaryBadge icon={<CheckCircle2 className="h-4 w-4" />} tone="success">
              Подтвердили: {totals.confirmed}
            </SummaryBadge>
            <SummaryBadge icon={<AlertTriangle className="h-4 w-4" />} tone="warning">
              Требуют внимания: {totals.escalation}
            </SummaryBadge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <div className="space-y-4">
          {tasks.map((task) => {
            const appointment = appointmentMap.get(task.appointmentId);
            const doctor = doctorMap.get(task.doctorId);
            const noteValue = notes[task.id] ?? task.note ?? '';

            return (
              <article
                key={task.id}
                className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {task.patientName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{task.patientPhone}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[task.status].className}`}>
                    {statusBadge[task.status].label}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-white/70 p-4 text-xs text-slate-500 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <PhoneCall className="h-3.5 w-3.5" />
                      {task.scheduledFor.slice(11, 16)} · {appointment ? appointment.room : '—'}
                    </span>
                    {appointment ? (
                      <span className="inline-flex items-center gap-1">
                        <Headphones className="h-3.5 w-3.5" />
                        {doctor?.name}
                      </span>
                    ) : null}
                    {appointment ? (
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Mic className="h-3.5 w-3.5" />
                        {appointment.procedure}
                      </span>
                    ) : null}
                  </div>
                  {appointment ? (
                    <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                      <span>
                        Время приёма: {appointment.time}–
                        {addMinutesToTime(appointment.time, appointment.duration)}
                      </span>
                      <span>
                        Статус: {appointmentStatusMeta[appointment.status].label}
                      </span>
                    </div>
                  ) : null}
                  {task.lastCallAt ? (
                    <p>Последний звонок: {formatTime(task.lastCallAt)}</p>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <Mic className="h-3.5 w-3.5" />
                    Заметка по звонку
                  </label>
                  <textarea
                    value={noteValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNotes((prev) => ({ ...prev, [task.id]: value }));
                      if (value.trim().length > 0) {
                        setErrors((prev) => ({ ...prev, [task.id]: undefined }));
                      }
                    }}
                    rows={3}
                    placeholder="Запишите ответ пациента или детали переноса"
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                  {errors[task.id] ? (
                    <p className="text-xs text-rose-500">{errors[task.id]}</p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {task.status === 'pending' || task.status === 'no-answer' || task.status === 'reschedule' ? (
                    <button
                      type="button"
                      onClick={() => handleStartCall(task.id)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-orange-500 hover:to-amber-500"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Начать звонок
                    </button>
                  ) : null}
                  {task.status === 'calling' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOutcome(task, 'confirmed')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Подтвердил
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOutcome(task, 'reschedule')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Перенос
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOutcome(task, 'no-answer')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-100"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Нет ответа
                      </button>
                    </div>
                  ) : null}
                  {task.status === 'confirmed' ? (
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-200">
                      Пациент подтвердил участие. Статус обновлён в расписании.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Скрипт звонка
            </h3>
            <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {scriptSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-orange-500/10 text-xs font-semibold text-orange-600 dark:bg-orange-500/20 dark:text-orange-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-orange-50 via-white to-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-900">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-200">
              Советы по эффективности звонков
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>Записывайте ключевые ответы пациента, чтобы врачу не пришлось повторно уточнять.</li>
              <li>Если пациент просит перенос, предложите два альтернативных окна сразу в разговоре.</li>
              <li>Для пациентов без ответа запланируйте повторный звонок и отметьте это в комментарии.</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

const formatTime = (iso: string) => iso.slice(11, 16);

interface SummaryBadgeProps {
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'warning';
}

function SummaryBadge({ icon, children, tone = 'default' }: SummaryBadgeProps) {
  const toneClasses = {
    default: 'bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses}`}>
      {icon}
      {children}
    </span>
  );
}

