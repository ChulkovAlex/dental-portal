import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MessageSquareText,
  RefreshCcw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

import { appointmentStatusMeta } from '../constants/appointmentStatus';
import { useSchedule } from '../context/ScheduleContext';
import type { Appointment, AppointmentStatus } from '../data/schedule';
import { tomorrowKey } from '../data/schedule';
import { addMinutesToTime, formatDateHuman, formatWeekday } from '../utils/date';

const statusStyles = {
  pending: {
    label: 'Ожидает ответа',
    className:
      'border border-dashed border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
    icon: <Clock className="h-4 w-4" />,
  },
  confirmed: {
    label: 'Подтверждено',
    className:
      'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  'needs-changes': {
    label: 'Требует изменений',
    className:
      'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
} as const;

type DoctorStatus = keyof typeof statusStyles;

const formatWeekdayLabel = (value: string) => {
  const raw = formatWeekday(value);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export default function DoctorConfirmationPanel() {
  const { appointments, doctors, doctorConfirmations, confirmDoctorDay } = useSchedule();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const tomorrowLabel = formatDateHuman(tomorrowKey, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const weekdayLabel = formatWeekdayLabel(tomorrowKey);

  const confirmationMap = useMemo(() => {
    const map = new Map<string, DoctorStatus>();
    doctorConfirmations
      .filter((item) => item.date === tomorrowKey)
      .forEach((item) => {
        map.set(item.doctorId, item.status);
      });
    return map;
  }, [doctorConfirmations]);

  const noteMap = useMemo(() => {
    const map = new Map<string, string | undefined>();
    doctorConfirmations
      .filter((item) => item.date === tomorrowKey)
      .forEach((item) => {
        map.set(item.doctorId, item.note);
      });
    return map;
  }, [doctorConfirmations]);

  const doctorAppointments = useMemo(() => {
    const grouped = new Map<string, GroupedAppointments>();
    doctors.forEach((doctor) => {
      grouped.set(doctor.id, buildGroupedAppointments(appointments, doctor.id, tomorrowKey));
    });
    return grouped;
  }, [appointments, doctors]);

  const totals = useMemo(() => {
    const summary = {
      confirmed: 0,
      pending: 0,
      needsChanges: 0,
      totalVisits: 0,
    };
    doctors.forEach((doctor) => {
      const status = confirmationMap.get(doctor.id) ?? 'pending';
      if (status === 'confirmed') summary.confirmed += 1;
      if (status === 'pending') summary.pending += 1;
      if (status === 'needs-changes') summary.needsChanges += 1;
      const grouped = doctorAppointments.get(doctor.id);
      summary.totalVisits += grouped?.total ?? 0;
    });
    return summary;
  }, [confirmationMap, doctorAppointments, doctors]);

  const handleConfirm = (doctorId: string) => {
    confirmDoctorDay(doctorId, tomorrowKey, 'confirmed', notes[doctorId]);
    setErrors((prev) => ({ ...prev, [doctorId]: undefined }));
  };

  const handleNeedsChanges = (doctorId: string) => {
    if (!notes[doctorId]?.trim()) {
      setErrors((prev) => ({ ...prev, [doctorId]: 'Опишите, что нужно изменить в расписании.' }));
      return;
    }
    confirmDoctorDay(doctorId, tomorrowKey, 'needs-changes', notes[doctorId]);
    setErrors((prev) => ({ ...prev, [doctorId]: undefined }));
  };

  const handleReset = (doctorId: string) => {
    confirmDoctorDay(doctorId, tomorrowKey, 'pending', notes[doctorId]);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Подтверждение расписания докторов
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              На {tomorrowLabel} · {weekdayLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatusBadge icon={<ShieldCheck className="h-4 w-4" />} colorClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-100">
              Подтвердили: {totals.confirmed} / {doctors.length}
            </StatusBadge>
            <StatusBadge icon={<Clock className="h-4 w-4" />} colorClass="bg-slate-100 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
              Ожидают: {totals.pending}
            </StatusBadge>
            <StatusBadge icon={<AlertTriangle className="h-4 w-4" />} colorClass="bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-100">
              Нужна реакция: {totals.needsChanges}
            </StatusBadge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {doctors.map((doctor) => {
          const status = confirmationMap.get(doctor.id) ?? 'pending';
          const schedule = doctorAppointments.get(doctor.id) ?? emptyGroup;
          const noteValue = notes[doctor.id] ?? noteMap.get(doctor.id) ?? '';

          return (
            <article
              key={doctor.id}
              className="flex h-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
            >
              <header className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{doctor.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{doctor.speciality}</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status].className}`}>
                  {statusStyles[status].icon}
                  {statusStyles[status].label}
                </span>
              </header>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm shadow-inner dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {schedule.total} приём(а)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5" />
                    {schedule.needsConfirmation} ждут подтверждения
                  </span>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  {schedule.slots.length > 0 ? (
                    schedule.slots.map((slot) => (
                      <li key={slot.id} className="flex items-start justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 shadow-sm dark:bg-slate-900/60">
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {slot.time}–{addMinutesToTime(slot.time, slot.duration)}
                        </span>
                        <span className="flex-1 truncate text-right text-slate-500 dark:text-slate-400">
                          {slot.patient}
                        </span>
                        <span className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${appointmentStatusMeta[slot.status].badgeClassName}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {appointmentStatusMeta[slot.status].label}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      Нет приёмов на завтра.
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  Комментарий доктора
                </label>
                <textarea
                  value={noteValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNotes((prev) => ({ ...prev, [doctor.id]: value }));
                    if (value.trim().length > 0) {
                      setErrors((prev) => ({ ...prev, [doctor.id]: undefined }));
                    }
                  }}
                  onBlur={() => {
                    const stored = noteMap.get(doctor.id) ?? '';
                    if (noteValue !== stored) {
                      confirmDoctorDay(doctor.id, tomorrowKey, status, noteValue);
                    }
                  }}
                  rows={3}
                  placeholder="Например: прошу сдвинуть имплантацию на 30 минут"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                {errors[doctor.id] ? (
                  <p className="text-xs text-rose-500">{errors[doctor.id]}</p>
                ) : null}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleConfirm(doctor.id)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-orange-500 hover:to-amber-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Подтвердить
                </button>
                <button
                  type="button"
                  onClick={() => handleNeedsChanges(doctor.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Нужны правки
                </button>
                {status !== 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleReset(doctor.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Вернуть в ожидание
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface GroupedAppointments {
  total: number;
  needsConfirmation: number;
  slots: {
    id: string;
    time: string;
    duration: number;
    patient: string;
    status: AppointmentStatus;
  }[];
}

const emptyGroup: GroupedAppointments = {
  total: 0,
  needsConfirmation: 0,
  slots: [],
};

const buildGroupedAppointments = (
  appointments: Appointment[],
  doctorId: string,
  date: string,
): GroupedAppointments => {
  const slots = appointments
    .filter((appointment) => appointment.date === date && appointment.doctorId === doctorId)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((appointment) => ({
      id: appointment.id,
      time: appointment.time,
      duration: appointment.duration,
      patient: appointment.patient.name,
      status: appointment.status,
    }));

  return {
    total: slots.length,
    needsConfirmation: slots.filter(
      (slot) => slot.status === 'needs-confirmation' || slot.status === 'needs-follow-up',
    ).length,
    slots,
  };
};

interface StatusBadgeProps {
  icon: React.ReactNode;
  colorClass: string;
  children: React.ReactNode;
}

function StatusBadge({ icon, colorClass, children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}
    >
      {icon}
      {children}
    </span>
  );
}

