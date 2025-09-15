import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

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
import { formatDateKey } from '../utils/date';

type CallOutcome = 'confirmed' | 'reschedule' | 'no-answer';

interface ScheduleContextValue {
  doctors: Doctor[];
  assistants: Assistant[];
  rooms: string[];
  appointments: Appointment[];
  doctorConfirmations: DoctorConfirmation[];
  callTasks: CallTask[];
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
}

const ScheduleContext = createContext<ScheduleContextValue | undefined>(undefined);

const ensureDateKey = (value: string) => formatDateKey(new Date(value));

export const ScheduleProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>(() => initialAppointments);
  const [doctorConfirmations, setDoctorConfirmations] = useState<DoctorConfirmation[]>(
    () => initialDoctorConfirmations,
  );
  const [callTasks, setCallTasks] = useState<CallTask[]>(() => initialCallTasks);

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

  const value = useMemo<ScheduleContextValue>(
    () => ({
      doctors: doctorList,
      assistants: initialAssistants,
      rooms: initialRooms,
      appointments,
      doctorConfirmations,
      callTasks,
      updateAppointmentStatus,
      updateAppointmentNote,
      confirmDoctorDay,
      startCall,
      finishCall,
    }),
    [appointments, doctorConfirmations, callTasks, confirmDoctorDay, finishCall, startCall, updateAppointmentNote, updateAppointmentStatus],
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

