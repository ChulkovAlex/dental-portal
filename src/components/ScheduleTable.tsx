import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ClipboardList,
  MapPin,
  Phone,
  Send,
  Stethoscope,
  UserRound,
} from 'lucide-react';

import { appointmentStatusMeta } from '../constants/appointmentStatus';
import { useSchedule } from '../context/ScheduleContext';
import type { Appointment, AppointmentStatus, DoctorConfirmation } from '../data/schedule';
import { sendNextcloudTalkBotMessage } from '../services/integrationModule';
import {
  addDays,
  addMinutesToTime,
  compareTime,
  formatDateHuman,
  formatDateKey,
  formatWeekday,
  parseDateKey,
} from '../utils/date';

const getStatusIcon = (status: AppointmentStatus) => {
  switch (status) {
    case 'confirmed':
    case 'completed':
      return <CheckCircle2 className="h-4 w-4" />;
    case 'needs-confirmation':
    case 'needs-follow-up':
      return <AlertCircle className="h-4 w-4" />;
    case 'checked-in':
      return <CalendarClock className="h-4 w-4" />;
    case 'cancelled':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <ClipboardList className="h-4 w-4" />;
  }
};

const emptyMessage = 'На выбранную дату пока нет записей. Добавьте приём или выберите другой день.';

const createDoctorAvatarStyle = (color: string) => ({
  background: color,
  boxShadow: `0 10px 30px ${color}33`,
});

const toDateInputValue = (value: string) => value;

const nextDate = (value: string, offset: number) => formatDateKey(addDays(parseDateKey(value), offset));

const confirmationStatusMeta: Record<DoctorConfirmation['status'], { label: string; className: string }> = {
  pending: {
    label: 'Ожидаем ответ доктора',
    className:
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
  },
  confirmed: {
    label: 'Доктор подтвердил расписание',
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100',
  },
  'needs-changes': {
    label: 'Доктор не подтвердил (нужны изменения)',
    className:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100',
  },
};

const formatDoctorReplyTime = (iso?: string) => {
  if (!iso) {
    return 'время ответа не зафиксировано';
  }

  return new Date(iso).toLocaleString('ru-RU');
};

export default function ScheduleTable() {
  const {
    appointments,
    doctors,
    assistants,
    doctorConfirmations,
    confirmDoctorDay,
  } = useSchedule();

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [sendBanner, setSendBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const appointmentsForSelectedDate = useMemo(
    () => appointments.filter((appointment) => appointment.date === selectedDate),
    [appointments, selectedDate],
  );

  const filteredAppointments = useMemo(
    () =>
      appointmentsForSelectedDate
        .filter((appointment) => selectedDoctorId === 'all' || appointment.doctorId === selectedDoctorId)
        .sort((a, b) => compareTime(a.time, b.time)),
    [appointmentsForSelectedDate, selectedDoctorId],
  );

  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors],
  );

  const assistantMap = useMemo(
    () => new Map(assistants.map((assistant) => [assistant.id, assistant])),
    [assistants],
  );

  const doctorsForDate = useMemo(() => {
    const doctorIds = new Set(filteredAppointments.map((appointment) => appointment.doctorId));
    const pool = doctorIds.size > 0 ? doctors.filter((doctor) => doctorIds.has(doctor.id)) : doctors;
    return selectedDoctorId === 'all'
      ? pool
      : pool.filter((doctor) => doctor.id === selectedDoctorId);
  }, [doctors, filteredAppointments, selectedDoctorId]);

  const confirmationsForDate = useMemo(() => {
    const map = new Map<string, DoctorConfirmation>();
    doctorConfirmations
      .filter((item) => item.date === selectedDate)
      .forEach((item) => {
        map.set(item.doctorId, item);
      });
    return map;
  }, [doctorConfirmations, selectedDate]);

  const dailyScheduleByDoctor = useMemo(() => {
    const map = new Map<string, Appointment[]>();

    appointmentsForSelectedDate
      .slice()
      .sort((a, b) => compareTime(a.time, b.time))
      .forEach((appointment) => {
        const bucket = map.get(appointment.doctorId) ?? [];
        bucket.push(appointment);
        map.set(appointment.doctorId, bucket);
      });

    return map;
  }, [appointmentsForSelectedDate]);

  const totals = useMemo(() => {
    const summary = {
      total: filteredAppointments.length,
      confirmed: 0,
      waiting: 0,
      followUp: 0,
      cancelled: 0,
    };
    filteredAppointments.forEach((appointment) => {
      switch (appointment.status) {
        case 'confirmed':
        case 'checked-in':
        case 'completed':
          summary.confirmed += 1;
          break;
        case 'needs-confirmation':
        case 'scheduled':
          summary.waiting += 1;
          break;
        case 'needs-follow-up':
          summary.followUp += 1;
          break;
        case 'cancelled':
          summary.cancelled += 1;
          break;
        default:
          break;
      }
    });
    return summary;
  }, [filteredAppointments]);

  const weekdayLabel = useMemo(() => {
    const raw = formatWeekday(selectedDate);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [selectedDate]);

  const confirmationTotals = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let needsChanges = 0;

    doctors.forEach((doctor) => {
      if (!dailyScheduleByDoctor.get(doctor.id)?.length) {
        return;
      }

      const status = confirmationsForDate.get(doctor.id)?.status ?? 'pending';
      if (status === 'confirmed') confirmed += 1;
      if (status === 'pending') pending += 1;
      if (status === 'needs-changes') needsChanges += 1;
    });

    return { confirmed, pending, needsChanges };
  }, [confirmationsForDate, dailyScheduleByDoctor, doctors]);

  const handleSendToDoctorConfirmation = async () => {
    setIsSending(true);
    setSendBanner(null);

    try {
      const dateLabel = formatDateHuman(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' });
      const pendingCount = appointmentsForSelectedDate.filter(
        (appointment) => appointment.status === 'scheduled' || appointment.status === 'needs-confirmation',
      ).length;

      const messageLines = [
        `Расписание на ${dateLabel}:`,
        ...doctors
          .filter((doctor) => (dailyScheduleByDoctor.get(doctor.id)?.length ?? 0) > 0)
          .flatMap((doctor) => {
            const doctorAppointments = dailyScheduleByDoctor.get(doctor.id) ?? [];
            return [
              ``,
              `${doctor.name} (${doctor.speciality})`,
              ...doctorAppointments.map(
                (appointment) =>
                  `• ${appointment.time}–${addMinutesToTime(appointment.time, appointment.duration)} · ${appointment.patient.name} · ${appointment.procedure} · ${appointment.room}`,
              ),
            ];
          }),
      ];

      await sendNextcloudTalkBotMessage({
        dateLabel,
        pendingCount,
        messageOverride: messageLines.join('\n'),
      });

      doctors.forEach((doctor) => {
        if ((dailyScheduleByDoctor.get(doctor.id)?.length ?? 0) > 0) {
          confirmDoctorDay(doctor.id, selectedDate, 'pending');
        }
      });

      setSendBanner({
        type: 'success',
        text: 'Расписание отправлено в Nextcloud Talk. Ожидаем ответ докторов на этой же странице.',
      });
    } catch (error) {
      setSendBanner({
        type: 'error',
        text: error instanceof Error ? error.message : 'Не удалось отправить расписание доктору.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const renderAppointment = (appointment: Appointment) => {
    const doctor = doctorMap.get(appointment.doctorId);
    const assistant = appointment.assistantId
      ? assistantMap.get(appointment.assistantId)
      : undefined;

    return (
      <article
        key={appointment.id}
        className="group relative flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80"
      >
        <div className="flex flex-col items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-200">
          <span>{appointment.time}</span>
          <span className="text-xs font-medium text-slate-400">
            {addMinutesToTime(appointment.time, appointment.duration)}
          </span>
        </div>
        <div className="absolute left-6 top-8 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-orange-400 shadow-md group-hover:bg-orange-500 dark:border-slate-900" />
        <div className="ml-6 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {appointment.patient.name}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${appointmentStatusMeta[appointment.status].badgeClassName}`}
            >
              {getStatusIcon(appointment.status)}
              {appointmentStatusMeta[appointment.status].label}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-300">{appointment.procedure}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {appointment.room}
            </span>
            {assistant ? (
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5" />
                Ассистент: {assistant.name}
              </span>
            ) : null}
            {doctor ? (
              <span className="inline-flex items-center gap-1">
                <UserRound className="h-3.5 w-3.5" />
                {doctor.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {appointment.patient.phone}
            </span>
          </div>
          {appointment.note ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">{appointment.note}</p>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Расписание приёмов
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {formatDateHuman(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
              · {weekdayLabel}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setSelectedDate((value) => nextDate(value, -1))}
                  className="rounded-full border border-transparent p-1 text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  aria-label="Предыдущий день"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 shadow-inner focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-orange-400"
                  value={toDateInputValue(selectedDate)}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate((value) => nextDate(value, 1))}
                  className="rounded-full border border-transparent p-1 text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  aria-label="Следующий день"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <select
                value={selectedDoctorId}
                onChange={(event) => setSelectedDoctorId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-orange-400"
              >
                <option value="all">Все врачи</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleSendToDoctorConfirmation()}
              disabled={isSending || appointmentsForSelectedDate.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-orange-600 hover:to-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Отправить на подтверждение доктору
            </button>
            {sendBanner ? (
              <p className={`text-xs ${sendBanner.type === 'success' ? 'text-emerald-600 dark:text-emerald-200' : 'text-rose-500'}`}>
                {sendBanner.text}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Всего визитов
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {totals.total}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/20">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-200">
              Подтверждено
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-100">
              {totals.confirmed}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/20">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-200">
              Ждут ответа
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-100">
              {totals.waiting}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm dark:border-orange-500/40 dark:bg-orange-500/20">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-200">
              Требуют внимания
            </p>
            <p className="mt-1 text-2xl font-semibold text-orange-700 dark:text-orange-100">
              {totals.followUp}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          {doctorsForDate.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
              {emptyMessage}
            </div>
          ) : (
            doctorsForDate.map((doctor) => {
              const appointmentsForDoctor = filteredAppointments.filter(
                (appointment) => appointment.doctorId === doctor.id,
              );
              return (
                <div
                  key={doctor.id}
                  className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:border-orange-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white shadow-lg"
                        style={createDoctorAvatarStyle(doctor.avatarColor)}
                      >
                        {doctor.name
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {doctor.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {doctor.speciality}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {doctor.workingHours.start} – {doctor.workingHours.end}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {doctor.phone}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {appointmentsForDoctor.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                        У врача нет приёмов на выбранную дату.
                      </div>
                    ) : (
                      <div className="relative pl-4">
                        <div className="absolute bottom-2 left-6 top-2 w-px bg-gradient-to-b from-orange-100 via-orange-200 to-transparent dark:from-orange-500/40 dark:via-orange-500/20" />
                        <div className="space-y-3">
                          {appointmentsForDoctor.map((appointment) => renderAppointment(appointment))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Подтверждение расписания на дату
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              После отправки через Nextcloud Talk ответы докторов отображаются здесь.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 font-semibold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100">
                ✓ {confirmationTotals.confirmed}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                … {confirmationTotals.pending}
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 font-semibold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-100">
                ! {confirmationTotals.needsChanges}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {doctors
                .filter((doctor) => (dailyScheduleByDoctor.get(doctor.id)?.length ?? 0) > 0)
                .map((doctor) => {
                  const confirmation = confirmationsForDate.get(doctor.id);
                  const status = confirmation?.status ?? 'pending';
                  return (
                    <article
                      key={doctor.id}
                      className={`rounded-2xl border px-3 py-3 text-xs ${confirmationStatusMeta[status].className}`}
                    >
                      <p className="font-semibold">{doctor.name}</p>
                      <p className="mt-1">{confirmationStatusMeta[status].label}</p>
                      <p className="mt-1 opacity-80">{formatDoctorReplyTime(confirmation?.updatedAt)}</p>
                      {confirmation?.note ? <p className="mt-2">Комментарий: {confirmation.note}</p> : null}
                    </article>
                  );
                })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-orange-50 via-white to-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-900">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-200">
              Подсказка администратора
            </h4>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Сначала выберите дату и отправьте график кнопкой «Отправить на подтверждение доктору».
              После ответа доктора статус автоматически отобразится справа как «подтвердил» или
              «не подтвердил».
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
