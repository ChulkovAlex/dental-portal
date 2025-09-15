import type { AppointmentStatus } from '../data/schedule';

export interface AppointmentStatusMeta {
  label: string;
  description: string;
  badgeClassName: string;
}

export const appointmentStatusOrder: AppointmentStatus[] = [
  'needs-confirmation',
  'needs-follow-up',
  'scheduled',
  'confirmed',
  'checked-in',
  'completed',
  'cancelled',
];

export const appointmentStatusMeta: Record<AppointmentStatus, AppointmentStatusMeta> = {
  scheduled: {
    label: 'Запланировано',
    description: 'Визит назначен и ожидает подтверждения пациента или доктора.',
    badgeClassName:
      'border-slate-200 bg-slate-50 text-slate-600 group-hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200',
  },
  'needs-confirmation': {
    label: 'Ждёт подтверждения',
    description: 'Нужно связаться с пациентом и получить подтверждение.',
    badgeClassName:
      'border-amber-200 bg-amber-50 text-amber-700 group-hover:border-amber-300 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200',
  },
  confirmed: {
    label: 'Подтверждено',
    description: 'Пациент подтвердил визит, можно готовить кабинет.',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-700 group-hover:border-emerald-300 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200',
  },
  'needs-follow-up': {
    label: 'Нужен повторный контакт',
    description: 'Голосовой ассистент не дозвонился, требуется внимание администратора.',
    badgeClassName:
      'border-orange-200 bg-orange-50 text-orange-700 group-hover:border-orange-300 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-200',
  },
  'checked-in': {
    label: 'Пациент в клинике',
    description: 'Пациент отметился в клинике и ожидает приёма.',
    badgeClassName:
      'border-blue-200 bg-blue-50 text-blue-700 group-hover:border-blue-300 dark:border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-200',
  },
  completed: {
    label: 'Завершено',
    description: 'Визит завершён, можно оформить документы.',
    badgeClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-700 group-hover:border-emerald-300 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-100',
  },
  cancelled: {
    label: 'Отменено',
    description: 'Запись отменена, слот можно отдать другому пациенту.',
    badgeClassName:
      'border-rose-200 bg-rose-50 text-rose-700 group-hover:border-rose-300 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-200',
  },
};

export const appointmentStatusSelectOptions = appointmentStatusOrder.filter(
  (status) => status !== 'needs-follow-up',
);

