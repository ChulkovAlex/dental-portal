import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  Appointment,
  AppointmentStatus,
  Assistant,
  CallTask,
  Doctor,
  DoctorConfirmation,
  appointments as initialAppointments,
  assistants as initialAssistants,
  callTasks as initialCallTasks,
  doctorConfirmations as initialDoctorConfirmations,
  doctors as doctorList,
  rooms as initialRooms,
} from '../data/schedule';
import { fetchIdentSettings } from '../services/integrationModule';
import { callIdentApi, createIdentConnectionConfig } from '../services/identApi';
import { formatDateKey } from '../utils/date';

type CallOutcome = 'confirmed' | 'reschedule' | 'no-answer';
type SyncIntervalUnit = 'seconds' | 'minutes';

interface ScheduleContextValue {
  doctors: Doctor[];
  assistants: Assistant[];
  rooms: string[];
  appointments: Appointment[];
  doctorConfirmations: DoctorConfirmation[];
  callTasks: CallTask[];
  identSyncIntervalValue: number;
  identSyncIntervalUnit: SyncIntervalUnit;
  identSyncInProgress: boolean;
  identLastSyncAt?: string;
  identSyncError?: string;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  updateAppointmentNote: (id: string, note: string) => void;
  confirmDoctorDay: (
    doctorId: string,
    date: string,
    status: DoctorConfirmation['status'],
    note?: string,
  ) => void;
  startCall: (taskId: string) => void;
  finishCall: (taskId: string, outcome: CallOutcome, note?: string) => void;
  setIdentSyncInterval: (value: number, unit: SyncIntervalUnit) => void;
  syncWithIdent: () => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

const ensureDateKey = (value: string) => formatDateKey(new Date(value));
const SYNC_INTERVAL_STORAGE_KEY = 'dental-portal-ident-sync-interval';

const statusMap: Record<string, AppointmentStatus> = {
  scheduled: 'scheduled',
  pending: 'needs-confirmation',
  'needs-confirmation': 'needs-confirmation',
  confirmed: 'confirmed',
  checkedin: 'checked-in',
  'checked-in': 'checked-in',
  completed: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  'needs-follow-up': 'needs-follow-up',
};

const parseDateTime = (rawValue: unknown): { date: string; time: string } | null => {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return null;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return {
    date: formatDateKey(date),
    time: `${hours}:${minutes}`,
  };
};

const toAppointmentsFromIdent = (payload: unknown, prevAppointments: Appointment[]): Appointment[] => {
  if (!Array.isArray(payload)) {
    return prevAppointments;
  }

  const fallbackDoctor = doctorList[0]?.id ?? 'doctor-denisenko';
  const fallbackRoom = initialRooms[0] ?? 'Кабинет 1';

  const mapped = payload
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const source = item as Record<string, unknown>;
      const rawDate = source.date ?? source.datetime_added ?? source.plan_start ?? source.startAt;
      const parsedDateTime = parseDateTime(rawDate);
      const date =
        (typeof source.date === 'string' && source.date.match(/^\d{4}-\d{2}-\d{2}$/)
          ? source.date
          : parsedDateTime?.date) ?? formatDateKey(new Date());
      const time =
        (typeof source.time === 'string' && source.time.match(/^\d{1,2}:\d{2}$/)
          ? source.time
          : parsedDateTime?.time) ?? '09:00';

      const statusKey = typeof source.status === 'string' ? source.status.trim().toLowerCase() : 'scheduled';
      const doctorId =
        typeof source.doctorId === 'string'
          ? source.doctorId
          : typeof source.id_staffs === 'string'
            ? source.id_staffs
            : typeof source.id_staffs === 'number'
              ? String(source.id_staffs)
              : fallbackDoctor;

      return {
        id: String(source.id ?? source.appointmentId ?? `ident-${date}-${time}-${index}`),
        date,
        time,
        duration:
          typeof source.duration === 'number' && Number.isFinite(source.duration)
            ? Math.max(15, Math.round(source.duration))
            : 30,
        doctorId,
        room: typeof source.room === 'string' && source.room.trim() ? source.room.trim() : fallbackRoom,
        procedure:
          typeof source.procedure === 'string' && source.procedure.trim()
            ? source.procedure.trim()
            : 'Процедура из iDent',
        status: statusMap[statusKey] ?? 'scheduled',
        patient: {
          name:
            (typeof source.patientName === 'string' && source.patientName.trim())
            || (typeof source.patient_fullname === 'string' && source.patient_fullname.trim())
            || (typeof source.name === 'string' && source.name.trim())
            || 'Пациент iDent',
          phone:
            (typeof source.phone === 'string' && source.phone.trim())
            || (typeof source.patientPhone === 'string' && source.patientPhone.trim())
            || '—',
        },
        note: typeof source.note === 'string' ? source.note : undefined,
      } satisfies Appointment;
    })
    .filter((appointment): appointment is Appointment => Boolean(appointment));

  return mapped.length > 0 ? mapped : prevAppointments;
};

const getStoredSyncInterval = (): { value: number; unit: SyncIntervalUnit } => {
  if (typeof window === 'undefined') {
    return { value: 5, unit: 'minutes' };
  }

  try {
    const raw = window.localStorage.getItem(SYNC_INTERVAL_STORAGE_KEY);
    if (!raw) {
      return { value: 5, unit: 'minutes' };
    }

    const parsed = JSON.parse(raw) as { value?: unknown; unit?: unknown };
    const value = typeof parsed.value === 'number' && Number.isFinite(parsed.value)
      ? Math.max(5, Math.min(120, Math.round(parsed.value)))
      : 5;
    const unit = parsed.unit === 'seconds' || parsed.unit === 'minutes' ? parsed.unit : 'minutes';

    return { value, unit };
  } catch (error) {
    console.error('Не удалось загрузить интервал синхронизации iDent', error);
    return { value: 5, unit: 'minutes' };
  }
};

export const ScheduleProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(() => initialAppointments);
  const [doctorConfirmations, setDoctorConfirmations] = useState<DoctorConfirmation[]>(
    () => initialDoctorConfirmations,
  );
  const [callTasks, setCallTasks] = useState<CallTask[]>(() => initialCallTasks);
  const [identSyncInProgress, setIdentSyncInProgress] = useState(false);
  const [identLastSyncAt, setIdentLastSyncAt] = useState<string | undefined>(undefined);
  const [identSyncError, setIdentSyncError] = useState<string | undefined>(undefined);
  const [identSyncIntervalValue, setIdentSyncIntervalValue] = useState(() => getStoredSyncInterval().value);
  const [identSyncIntervalUnit, setIdentSyncIntervalUnit] = useState<SyncIntervalUnit>(() => getStoredSyncInterval().unit);

  const updateAppointmentStatus = useCallback((id: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );
  }, []);

  const updateAppointmentNote = useCallback((id: string, note: string) => {
    setAppointments((prev) =>
      prev.map((appointment) =>
        appointment.id === id ? { ...appointment, note } : appointment,
      ),
    );
  }, []);

  const confirmDoctorDay = useCallback(
    (doctorId: string, date: string, status: DoctorConfirmation['status'], note?: string) => {
      const dateKey = ensureDateKey(date);
      setDoctorConfirmations((prev) => {
        const next = [...prev];
        const index = next.findIndex(
          (item) => item.doctorId === doctorId && item.date === dateKey,
        );
        const payload: DoctorConfirmation = {
          doctorId,
          date: dateKey,
          status,
          note: note?.trim() ? note.trim() : undefined,
          updatedAt: new Date().toISOString(),
        };
        if (index >= 0) {
          next[index] = { ...next[index], ...payload };
        } else {
          next.push(payload);
        }
        return next;
      });
    },
    [],
  );

  const startCall = useCallback((taskId: string) => {
    setCallTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: 'calling',
              attempts: task.status === 'calling' ? task.attempts : task.attempts + 1,
              lastCallAt: new Date().toISOString(),
            }
          : task,
      ),
    );
  }, []);

  const finishCall = useCallback(
    (taskId: string, outcome: CallOutcome, note?: string) => {
      const relatedTask = callTasks.find((task) => task.id === taskId);
      setCallTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: outcome,
                note: note?.trim() ? note.trim() : undefined,
                lastCallAt: new Date().toISOString(),
              }
            : task,
        ),
      );

      if (relatedTask) {
        setAppointments((prev) =>
          prev.map((appointment) => {
            if (appointment.id !== relatedTask.appointmentId) {
              return appointment;
            }
            const nextStatus: AppointmentStatus =
              outcome === 'confirmed' ? 'confirmed' : 'needs-follow-up';
            return {
              ...appointment,
              status: nextStatus,
              note: note?.trim() ? note.trim() : appointment.note,
            };
          }),
        );
      }
    },
    [callTasks],
  );

  const setIdentSyncInterval = useCallback((value: number, unit: SyncIntervalUnit) => {
    const nextValue = Math.max(5, Math.min(120, Math.round(value)));
    setIdentSyncIntervalValue(nextValue);
    setIdentSyncIntervalUnit(unit);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        SYNC_INTERVAL_STORAGE_KEY,
        JSON.stringify({ value: nextValue, unit }),
      );
    }
  }, []);

  const syncWithIdent = useCallback(async () => {
    setIdentSyncInProgress(true);

    try {
      const settings = await fetchIdentSettings();
      if (!settings.connected || !settings.syncSchedule) {
        throw new Error('Синхронизация расписания отключена в настройках iDent.');
      }

      const config = createIdentConnectionConfig(settings);
      const payload = await callIdentApi<unknown>(config, '/api/schedule');
      setAppointments((prev) => toAppointmentsFromIdent(payload, prev));
      setIdentLastSyncAt(new Date().toISOString());
      setIdentSyncError(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось синхронизировать расписание с iDent.';
      setIdentSyncError(message);
    } finally {
      setIdentSyncInProgress(false);
    }
  }, []);

  useEffect(() => {
    const timeoutMs = identSyncIntervalUnit === 'seconds'
      ? identSyncIntervalValue * 1000
      : identSyncIntervalValue * 60 * 1000;

    const timer = window.setInterval(() => {
      void syncWithIdent();
    }, timeoutMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [identSyncIntervalUnit, identSyncIntervalValue, syncWithIdent]);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      doctors: doctorList,
      assistants: initialAssistants,
      rooms: initialRooms,
      appointments,
      doctorConfirmations,
      callTasks,
      identSyncIntervalValue,
      identSyncIntervalUnit,
      identSyncInProgress,
      identLastSyncAt,
      identSyncError,
      updateAppointmentStatus,
      updateAppointmentNote,
      confirmDoctorDay,
      startCall,
      finishCall,
      setIdentSyncInterval,
      syncWithIdent,
    }),
    [appointments, doctorConfirmations, callTasks, identSyncIntervalValue, identSyncIntervalUnit, identSyncInProgress, identLastSyncAt, identSyncError, confirmDoctorDay, finishCall, setIdentSyncInterval, startCall, syncWithIdent, updateAppointmentNote, updateAppointmentStatus],
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = (): ScheduleContextValue => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule должен использоваться внутри ScheduleProvider');
  }
  return context;
};
