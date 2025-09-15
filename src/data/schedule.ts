import { addDays, formatDateKey } from '../utils/date';

export type AppointmentStatus =
  | 'scheduled'
  | 'needs-confirmation'
  | 'confirmed'
  | 'checked-in'
  | 'completed'
  | 'cancelled'
  | 'needs-follow-up';

export interface PatientInfo {
  name: string;
  phone: string;
  notes?: string;
}

export interface Appointment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutes
  doctorId: string;
  assistantId?: string;
  room: string;
  procedure: string;
  status: AppointmentStatus;
  patient: PatientInfo;
  note?: string;
}

export interface Doctor {
  id: string;
  name: string;
  speciality: string;
  phone: string;
  email: string;
  avatarColor: string;
  workingHours: {
    start: string;
    end: string;
  };
}

export interface Assistant {
  id: string;
  name: string;
}

export interface DoctorConfirmation {
  doctorId: string;
  date: string;
  status: 'pending' | 'confirmed' | 'needs-changes';
  note?: string;
  updatedAt?: string;
}

export interface CallTask {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientName: string;
  patientPhone: string;
  scheduledFor: string;
  status: 'pending' | 'calling' | 'confirmed' | 'reschedule' | 'no-answer';
  attempts: number;
  lastCallAt?: string;
  note?: string;
}

const baseDate = new Date();
export const todayKey = formatDateKey(baseDate);
export const tomorrowKey = formatDateKey(addDays(baseDate, 1));
export const dayAfterTomorrowKey = formatDateKey(addDays(baseDate, 2));

export const rooms = ['Кабинет 1', 'Кабинет 2', 'Хирургический блок'];

export const assistants: Assistant[] = [
  { id: 'assistant-maria', name: 'Мария Антонова' },
  { id: 'assistant-kirill', name: 'Кирилл Юматов' },
  { id: 'assistant-vika', name: 'Виктория Шестакова' },
];

export const doctors: Doctor[] = [
  {
    id: 'doctor-denisenko',
    name: 'Анастасия Денисенко',
    speciality: 'Терапевт, ортопед',
    phone: '+7 (921) 555-44-11',
    email: 'denisenko@clinic.ru',
    avatarColor: '#f97316',
    workingHours: { start: '09:00', end: '17:00' },
  },
  {
    id: 'doctor-lebedeva',
    name: 'Мария Лебедева',
    speciality: 'Хирург-имплантолог',
    phone: '+7 (921) 555-88-22',
    email: 'lebedeva@clinic.ru',
    avatarColor: '#6366f1',
    workingHours: { start: '10:00', end: '18:00' },
  },
  {
    id: 'doctor-smirnov',
    name: 'Илья Смирнов',
    speciality: 'Детский стоматолог',
    phone: '+7 (921) 777-12-34',
    email: 'smirnov@clinic.ru',
    avatarColor: '#0ea5e9',
    workingHours: { start: '08:30', end: '15:30' },
  },
];

export const appointments: Appointment[] = [
  {
    id: 'apt-1',
    date: todayKey,
    time: '09:00',
    duration: 50,
    doctorId: 'doctor-denisenko',
    assistantId: 'assistant-maria',
    room: 'Кабинет 1',
    procedure: 'Первичная консультация и диагностика',
    status: 'checked-in',
    patient: {
      name: 'Сергей Иванов',
      phone: '+7 (921) 100-20-30',
      notes: 'Аллергия на лидокаин, бережный подход',
    },
    note: 'Подготовить снимок 3D, повторить рекомендации по гигиене.',
  },
  {
    id: 'apt-2',
    date: todayKey,
    time: '10:15',
    duration: 60,
    doctorId: 'doctor-denisenko',
    assistantId: 'assistant-maria',
    room: 'Кабинет 1',
    procedure: 'Лечение кариеса 1.6',
    status: 'confirmed',
    patient: {
      name: 'Алина Кузнецова',
      phone: '+7 (921) 555-10-70',
    },
    note: 'Пациент просил напомнить о скидке по ДМС.',
  },
  {
    id: 'apt-3',
    date: todayKey,
    time: '12:00',
    duration: 90,
    doctorId: 'doctor-lebedeva',
    assistantId: 'assistant-kirill',
    room: 'Хирургический блок',
    procedure: 'Удаление восьмерки справа снизу',
    status: 'scheduled',
    patient: {
      name: 'Игорь Сидоров',
      phone: '+7 (921) 700-40-40',
    },
    note: 'Проверить свежесть набора имплантов.',
  },
  {
    id: 'apt-4',
    date: todayKey,
    time: '14:30',
    duration: 30,
    doctorId: 'doctor-smirnov',
    assistantId: 'assistant-vika',
    room: 'Кабинет 2',
    procedure: 'Детская гигиена, 8 лет',
    status: 'completed',
    patient: {
      name: 'Егор Павликов',
      phone: '+7 (921) 880-11-33',
      notes: 'С собой мама, просьба подарить наклейку.',
    },
    note: 'Назначить повтор через 6 месяцев.',
  },
  {
    id: 'apt-5',
    date: tomorrowKey,
    time: '09:00',
    duration: 60,
    doctorId: 'doctor-denisenko',
    assistantId: 'assistant-maria',
    room: 'Кабинет 1',
    procedure: 'Плановая профессиональная чистка',
    status: 'needs-confirmation',
    patient: {
      name: 'Надежда Алексеева',
      phone: '+7 (921) 120-90-10',
      notes: 'Предпочитает звонки утром, предупредить об оплате картой.',
    },
    note: 'Подготовить индивидуальные рекомендации по щетке.',
  },
  {
    id: 'apt-6',
    date: tomorrowKey,
    time: '10:30',
    duration: 45,
    doctorId: 'doctor-denisenko',
    assistantId: 'assistant-maria',
    room: 'Кабинет 1',
    procedure: 'Замена временной пломбы 2.4',
    status: 'scheduled',
    patient: {
      name: 'Максим Трофимов',
      phone: '+7 (921) 340-11-99',
    },
    note: 'Необходимо согласовать время с его работой, возможен перенос.',
  },
  {
    id: 'apt-7',
    date: tomorrowKey,
    time: '12:00',
    duration: 120,
    doctorId: 'doctor-lebedeva',
    assistantId: 'assistant-kirill',
    room: 'Хирургический блок',
    procedure: 'Установка импланта Astra Tech',
    status: 'confirmed',
    patient: {
      name: 'Александр Громов',
      phone: '+7 (921) 500-66-99',
    },
    note: 'Заказать доп. набор абатментов, проверка КТ перед приемом.',
  },
  {
    id: 'apt-8',
    date: tomorrowKey,
    time: '15:00',
    duration: 30,
    doctorId: 'doctor-smirnov',
    assistantId: 'assistant-vika',
    room: 'Кабинет 2',
    procedure: 'Герметизация фиссур',
    status: 'needs-confirmation',
    patient: {
      name: 'Семён Ларионов',
      phone: '+7 (921) 660-44-21',
      notes: 'Требуется письменное согласие от родителей.',
    },
    note: 'Подготовить набор для герметизации и наклейки для ребёнка.',
  },
  {
    id: 'apt-9',
    date: dayAfterTomorrowKey,
    time: '09:30',
    duration: 50,
    doctorId: 'doctor-denisenko',
    assistantId: 'assistant-maria',
    room: 'Кабинет 1',
    procedure: 'Контроль после лечения канала',
    status: 'scheduled',
    patient: {
      name: 'Ирина Полянская',
      phone: '+7 (921) 410-70-12',
    },
  },
  {
    id: 'apt-10',
    date: dayAfterTomorrowKey,
    time: '11:00',
    duration: 30,
    doctorId: 'doctor-smirnov',
    assistantId: 'assistant-vika',
    room: 'Кабинет 2',
    procedure: 'Осмотр после ортодонтического лечения',
    status: 'scheduled',
    patient: {
      name: 'Дарья Чернова',
      phone: '+7 (921) 320-55-43',
    },
    note: 'Принести снимки с прошлого приема.',
  },
];

export const doctorConfirmations: DoctorConfirmation[] = doctors.map((doctor) => ({
  doctorId: doctor.id,
  date: tomorrowKey,
  status: doctor.id === 'doctor-lebedeva' ? 'confirmed' : 'pending',
  note:
    doctor.id === 'doctor-lebedeva'
      ? 'Готова начать в 12:00, ассистент предупрежден.'
      : undefined,
  updatedAt: doctor.id === 'doctor-lebedeva' ? new Date().toISOString() : undefined,
}));

export const callTasks: CallTask[] = [
  {
    id: 'call-apt-5',
    appointmentId: 'apt-5',
    doctorId: 'doctor-denisenko',
    patientName: 'Надежда Алексеева',
    patientPhone: '+7 (921) 120-90-10',
    scheduledFor: `${tomorrowKey}T09:00:00`,
    status: 'pending',
    attempts: 0,
  },
  {
    id: 'call-apt-6',
    appointmentId: 'apt-6',
    doctorId: 'doctor-denisenko',
    patientName: 'Максим Трофимов',
    patientPhone: '+7 (921) 340-11-99',
    scheduledFor: `${tomorrowKey}T10:30:00`,
    status: 'pending',
    attempts: 1,
    lastCallAt: `${todayKey}T08:30:00`,
    note: 'Вчера не ответил на звонок, повторить утром.',
  },
  {
    id: 'call-apt-7',
    appointmentId: 'apt-7',
    doctorId: 'doctor-lebedeva',
    patientName: 'Александр Громов',
    patientPhone: '+7 (921) 500-66-99',
    scheduledFor: `${tomorrowKey}T12:00:00`,
    status: 'confirmed',
    attempts: 1,
    lastCallAt: `${todayKey}T11:00:00`,
    note: 'Пациент подтвердил визит, просил подготовить договор.',
  },
  {
    id: 'call-apt-8',
    appointmentId: 'apt-8',
    doctorId: 'doctor-smirnov',
    patientName: 'Семён Ларионов',
    patientPhone: '+7 (921) 660-44-21',
    scheduledFor: `${tomorrowKey}T15:00:00`,
    status: 'no-answer',
    attempts: 2,
    lastCallAt: `${todayKey}T12:45:00`,
    note: 'Не взяли трубку, попробовать позвонить родителям повторно.',
  },
];

