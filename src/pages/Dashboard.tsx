import React from 'react';
import { CheckCircle2, PhoneCall, Users } from 'lucide-react';

import DoctorConfirmationPanel from '../components/DoctorConfirmationPanel';
import VoiceAssistantPanel from '../components/VoiceAssistantPanel';
import { ScheduleProvider, useSchedule } from '../context/ScheduleContext';
import PortalHeader from '../components/PortalHeader';
import { formatDateKey } from '../utils/date';

export default function Dashboard() {
  return (
    <ScheduleProvider>
      <DashboardContent />
    </ScheduleProvider>
  );
}

function DashboardContent() {
  const { appointments, callTasks, doctors } = useSchedule();

  const todayKey = formatDateKey(new Date());
  const todaysAppointments = appointments.filter((appointment) => appointment.date === todayKey);
  const confirmedToday = todaysAppointments.filter((appointment) =>
    ['confirmed', 'checked-in', 'completed'].includes(appointment.status),
  ).length;
  const activeCalls = callTasks.filter((task) => task.status === 'pending' || task.status === 'calling').length;

  const cards = [
    {
      title: 'Врачи в графике',
      value: `${doctors.length} специалистов`,
      icon: <Users />,
      color: 'from-sky-400 to-indigo-400',
    },
    {
      title: 'Подтверждены сегодня',
      value: `${confirmedToday}/${todaysAppointments.length || 0}`,
      icon: <CheckCircle2 />,
      color: 'from-emerald-400 to-green-500',
    },
    {
      title: 'Звонки ассистента',
      value: activeCalls ? `${activeCalls} в работе` : 'Все выполнены',
      icon: <PhoneCall />,
      color: 'from-purple-400 to-pink-500',
    },
  ];

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Клиника доктора Денисенко"
        subtitle="Дашборд с ключевыми метриками и операционными панелями"
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:py-10">
        <div className="rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 p-6 text-white shadow-xl md:p-8">
          <h2 className="text-2xl font-bold md:text-3xl">Добро пожаловать, Администратор!</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/85">
            Расписание вынесено в отдельную вкладку. Здесь оставили только ключевые показатели,
            подтверждения докторов и задачи голосового ассистента.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-page bg-card p-5 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className={`mb-4 inline-flex rounded-full bg-gradient-to-r ${card.color} p-3 text-white`}>
                {React.cloneElement(card.icon, { className: 'h-6 w-6' })}
              </div>
              <p className="text-sm text-page/70">{card.title}</p>
              <p className="text-2xl font-bold text-page">{card.value}</p>
            </div>
          ))}
        </div>

        <DoctorConfirmationPanel />
        <VoiceAssistantPanel />
      </main>
    </div>
  );
}
