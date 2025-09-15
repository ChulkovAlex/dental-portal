import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, UserRound } from 'lucide-react';

import { appointmentStatusMeta } from '../constants/appointmentStatus';
import { useSchedule } from '../context/ScheduleContext';
import type { Appointment } from '../data/schedule';
import { addMinutesToTime, formatDateHuman, formatDateKey } from '../utils/date';

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function CalendarView() {
  const { appointments, rooms, doctors } = useSchedule();
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(today));

  const monthKey = `${viewDate.getFullYear()}-${viewDate.getMonth()}`;

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    appointments.forEach((appointment) => {
      const date = appointment.date;
      const existing = grouped.get(date) ?? [];
      existing.push(appointment);
      grouped.set(date, existing);
    });
    grouped.forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return grouped;
  }, [appointments]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }).map((_, index) => {
    const dayOffset = index - firstWeekday;
    const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayOffset + 1);
    const key = formatDateKey(cellDate);
    const inCurrentMonth = cellDate.getMonth() === viewDate.getMonth();
    const dayAppointments = appointmentsByDate.get(key) ?? [];
    const requiresAttention = dayAppointments.some(
      (appointment) => appointment.status === 'needs-confirmation' || appointment.status === 'needs-follow-up',
    );
    const confirmedCount = dayAppointments.filter((appointment) => appointment.status === 'confirmed').length;
    return {
      date: cellDate,
      key,
      inCurrentMonth,
      appointments: dayAppointments,
      requiresAttention,
      confirmedCount,
    };
  });

  const selectedAppointments = appointmentsByDate.get(selectedDate) ?? [];
  const appointmentsByRoom = useMemo(() => {
    const grouped = new Map<string, Appointment[]>();
    rooms.forEach((room) => grouped.set(room, []));
    selectedAppointments.forEach((appointment) => {
      const room = grouped.get(appointment.room);
      if (room) {
        room.push(appointment);
      } else {
        grouped.set(appointment.room, [appointment]);
      }
    });
    grouped.forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return grouped;
  }, [rooms, selectedAppointments]);

  const shiftMonth = (offset: number) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + offset);
      return next;
    });
  };

  const selectToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(formatDateKey(today));
  };

  const doctorMap = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor])), [doctors]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Месячный обзор</h2>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              {formatDateHuman(formatDateKey(viewDate), { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Предыдущий месяц
            </button>
            <button
              type="button"
              onClick={selectToday}
              className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-100"
            >
              <Calendar className="h-4 w-4" />
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-orange-200 hover:text-orange-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Следующий месяц
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-7 bg-slate-50 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
            {weekdayLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 border-t border-slate-200 text-sm dark:border-slate-700">
            {cells.map((cell) => {
              const isSelected = cell.key === selectedDate;
              const isToday = cell.key === formatDateKey(today);
              return (
                <button
                  key={`${monthKey}-${cell.key}`}
                  type="button"
                  onClick={() => setSelectedDate(cell.key)}
                  className={`relative min-h-[92px] border-b border-r border-slate-200 p-3 text-left transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 dark:border-slate-700 dark:hover:bg-orange-500/10 ${
                    cell.inCurrentMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 text-slate-400 dark:bg-slate-900/60 dark:text-slate-600'
                  } ${isSelected ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? 'bg-orange-500 text-white shadow'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  {cell.appointments.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {cell.appointments.length} визитов
                      </p>
                      {cell.requiresAttention ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-100">
                          Требует подтверждения
                        </span>
                      ) : null}
                      {cell.confirmedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100">
                          Подтверждено: {cell.confirmedCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatDateHuman(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-300">
              Распределение по кабинетам и статусам
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from(appointmentsByRoom.entries()).map(([room, list]) => (
            <div
              key={room}
              className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
            >
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{room}</h4>
              {list.length > 0 ? (
                <ul className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {list.map((appointment) => {
                    const doctor = doctorMap.get(appointment.doctorId);
                    return (
                      <li
                        key={appointment.id}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-inner transition hover:border-orange-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <Clock className="h-3.5 w-3.5" />
                            {appointment.time}–{addMinutesToTime(appointment.time, appointment.duration)}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${appointmentStatusMeta[appointment.status].badgeClassName}`}>
                            {appointmentStatusMeta[appointment.status].label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                          {appointment.patient.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {doctor ? (
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3.5 w-3.5" />
                              {doctor.name}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {appointment.room}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          {appointment.procedure}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
                  Нет записей на этот день в кабинете.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

