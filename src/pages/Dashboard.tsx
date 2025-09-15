import React from 'react';
import { CalendarDays, Users, BarChart2, Settings, Moon, Sun } from 'lucide-react';
import { useDark } from '../hooks/useDark';
import DynamicCalendar from '../components/DynamicCalendar';

export default function Dashboard() {
  const [dark, toggleDark] = useDark();

  const cards = [
    { title: 'Расписание', value: '12 слотов', icon: <CalendarDays />, color: 'from-orange-400 to-yellow-400' },
    { title: 'Врачи',       value: '8 онлайн',  icon: <Users />,       color: 'from-amber-400 to-orange-400' },
    { title: 'Аналитика',   value: '↑ 14 %',    icon: <BarChart2 />,   color: 'from-green-400 to-emerald-400' },
    { title: 'Настройки',   value: '3 увед.',   icon: <Settings />,    color: 'from-purple-400 to-pink-400' },
  ];

  return (
    <div className="min-h-screen bg-page text-page">
      {/* Шапка */}
      <header className="bg-card/80 backdrop-blur-lg shadow-sm border-b border-page sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold">Клиника доктора Денисенко</h1>
            <button
              onClick={toggleDark}
              className="p-2 rounded-full bg-card border border-page"
              title="Переключить тему"
            >
              {dark ? <Moon className="accent w-5 h-5" /> : <Sun className="accent w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        {/* Приветственный баннер */}
        <div className="bg-gradient-to-r from-orange-400 to-yellow-400 rounded-2xl p-8 text-white shadow-xl">
          <h2 className="text-3xl font-bold">Добро пожаловать, Администратор!</h2>
          <p className="text-sm mt-1">Управляйте расписанием, врачами и аналитикой в одном месте.</p>
        </div>

        {/* Карточки */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c, i) => (
            <div
              key={i}
              className={`bg-card border border-page rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1`}
            >
              <div className={`inline-block p-3 rounded-full bg-gradient-to-r ${c.color} text-white mb-4`}>
                {React.cloneElement(c.icon, { className: 'w-6 h-6' })}
              </div>
              <p className="text-sm text-page/70">{c.title}</p>
              <p className="text-2xl font-bold text-page">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Календарь */}
        <DynamicCalendar />
      </main>
    </div>
  );
}
