import React, { useEffect, useMemo, useState } from 'react';
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
  Stethoscope,
  UserRound,
} from 'lucide-react';

import { appointmentStatusMeta, appointmentStatusSelectOptions } from '../constants/appointmentStatus';
import { useSchedule } from '../context/ScheduleContext';
import type { Appointment, AppointmentStatus } from '../data/schedule';
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

const minutesToLabel = (minutes: number) => `${minutes} мин.`;

export default function ScheduleTable() {
  const {
    appointments,
    doctors,
    assistants,
    updateAppointmentStatus,
    updateAppointmentNote,
  } = useSchedule();

  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateKey(new Date()));
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');

  const filteredAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.date === selectedDate &&
            (selectedDoctorId === 'all' || appointment.doctorId === selectedDoctorId),
        )
        .sort((a, b) => compareTime(a.time, b.time)),
    [appointments, selectedDate, selectedDoctorId],
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

  useEffect(() => {
    if (!selectedAppointmentId && filteredAppointments.length > 0) {
      setSelectedAppointmentId(filteredAppointments[0].id);
      return;
    }
    if (selectedAppointmentId && !filteredAppointments.some((appointment) => appointment.id === selectedAppointmentId)) {
      setSelectedAppointmentId(filteredAppointments[0]?.id ?? null);
    }
  }, [filteredAppointments, selectedAppointmentId]);

  const selectedAppointment = filteredAppointments.find(
    (appointment) => appointment.id === selectedAppointmentId,
  );

  useEffect(() => {
    setNoteDraft(selectedAppointment?.note ?? '');
  }, [selectedAppointment?.id, selectedAppointment?.note]);

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

  const handleStatusChange = (status: AppointmentStatus) => {
    if (selectedAppointment) {
      updateAppointmentStatus(selectedAppointment.id, status);
    }
  };

  const handleSaveNote = () => {
    if (selectedAppointment) {
      updateAppointmentNote(selectedAppointment.id, noteDraft);
    }
  };

  const renderAppointment = (appointment: Appointment) => {
    const doctor = doctorMap.get(appointment.doctorId);
    const assistant = appointment.assistantId
      ? assistantMap.get(appointment.assistantId)
      : undefined;
    const isActive = appointment.id === selectedAppointmentId;

    return (
      <button
        key={appointment.id}
        onClick={() => setSelectedAppointmentId(appointment.id)}
        className={`group relative flex w-full items-start gap-3 rounded-2xl border bg-white/80 p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 ${
          isActive ? 'border-orange-400 shadow-lg ring-2 ring-orange-200 dark:ring-orange-400/40' : 'border-slate-200'
        }`}
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
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {appointment.procedure}
          </p>
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
          </div>
          {appointment.note ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {appointment.note}
            </p>
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Расписание приёмов
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {formatDateHuman(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
              · {weekdayLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
                className="rounded-xl border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 shadow-inner focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-orange-400"
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
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
                        <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-orange-100 via-orange-200 to-transparent dark:from-orange-500/40 dark:via-orange-500/20" />
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
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Детали визита</h3>
            {selectedAppointment ? (
              <div className="mt-4 space-y-5">
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedAppointment.patient.name}
                  </p>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedAppointment.patient.phone}
                    </span>
                    {selectedAppointment.patient.notes ? (
                      <span className="inline-flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                        {selectedAppointment.patient.notes}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {selectedAppointment.time} · {minutesToLabel(selectedAppointment.duration)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedAppointment.room}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <p className="font-medium">{selectedAppointment.procedure}</p>
                    {selectedAppointment.note ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedAppointment.note}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5" />
                      {doctorMap.get(selectedAppointment.doctorId)?.name}
                    </span>
                    {selectedAppointment.assistantId ? (
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3.5 w-3.5" />
                        Ассистент: {assistantMap.get(selectedAppointment.assistantId)?.name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="appointment-status"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                    >
                      Статус визита
                    </label>
                    <select
                      id="appointment-status"
                      value={selectedAppointment.status}
                      onChange={(event) => handleStatusChange(event.target.value as AppointmentStatus)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-orange-400"
                    >
                      {appointmentStatusSelectOptions.map((status) => (
                        <option key={status} value={status}>
                          {appointmentStatusMeta[status].label}
                        </option>
                      ))}
                </select>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {appointmentStatusMeta[selectedAppointment.status].description}
                </p>
                  </div>

                  <div>
                    <label
                      htmlFor="appointment-note"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                    >
                      Комментарий администратора
                    </label>
                    <textarea
                      id="appointment-note"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      onBlur={handleSaveNote}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-orange-400"
                      placeholder="Добавьте важные детали, которые нужно учесть перед приёмом"
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Комментарий сохраняется автоматически при выходе из поля.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-orange-50 via-white to-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:from-orange-500/20 dark:via-slate-900 dark:to-slate-900">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-200">
              Подсказка администратора
            </h4>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Используйте фильтры по врачу и статусу, чтобы видеть только те приёмы, которые
              требуют подтверждения или подготовки. В деталях визита можно сразу обновить
              статус и оставить заметку для команды.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

