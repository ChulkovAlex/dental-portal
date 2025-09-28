import React from 'react';
import { CalendarDays, CheckCircle2, PhoneCall, Users } from 'lucide-react';

import DoctorConfirmationPanel from '../components/DoctorConfirmationPanel';
import ScheduleTable from '../components/ScheduleTable';
import VoiceAssistantPanel from '../components/VoiceAssistantPanel';
import CalendarView from '../components/CalendarView';
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
      title: 'Приёмы сегодня',
      value: todaysAppointments.length ? `${todaysAppointments.length}` : 'Нет записей',
      icon: <CalendarDays />,
      color: 'from-orange-400 to-amber-400',
    },
    {
      title: 'Врачи в графике',
      value: `${doctors.length} специалистов`,
      icon: <Users />,
      color: 'from-sky-400 to-indigo-400',
    },
    {
      title: 'Подтверждены',
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
        subtitle="Управление расписанием, персоналом и коммуникациями"
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <div className="rounded-2xl bg-gradient-to-r from-orange-400 to-yellow-400 p-8 text-white shadow-xl">
          <h2 className="text-3xl font-bold">Добро пожаловать, Администратор!</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/80">
            Единый центр управления расписанием, подтверждениями докторов и работой голосового ассистента.
            Следите за статусами приёмов и мгновенно обновляйте информацию для команды.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-page bg-card p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className={`mb-4 inline-flex rounded-full bg-gradient-to-r ${card.color} p-3 text-white`}>
                {React.cloneElement(card.icon, { className: 'h-6 w-6' })}
              </div>
              <p className="text-sm text-page/70">{card.title}</p>
              <p className="text-2xl font-bold text-page">{card.value}</p>
            </div>
          ))}
        </div>

        <ScheduleTable />
        <DoctorConfirmationPanel />
        <VoiceAssistantPanel />
        <CalendarView />
      </main>
    </div>
  );
}