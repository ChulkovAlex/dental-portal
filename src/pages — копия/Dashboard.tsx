import React from 'react';
import { CalendarDays, Users, BarChart2, Settings, Bell, Sun, Moon } from 'lucide-react';
import { useDark } from '../hooks/useDark';
import SettingsMenu from '../components/SettingsMenu';

// внутри return, после основного контента:
<section className="max-w-7xl mx-auto px-4 py-10">
  <SettingsMenu />
</section>

export default function Dashboard() {
  const [dark, toggleDark] = useDark();

  const cards = [
    { title: 'Расписание', value: '12 слотов', icon: <CalendarDays className="w-8 h-8 accent" /> },
    { title: 'Врачи', value: '8 онлайн', icon: <Users className="w-8 h-8 accent" /> },
    { title: 'Аналитика', value: '↑ 14 %', icon: <BarChart2 className="w-8 h-8 accent" /> },
    { title: 'Настройки', value: '3 увед.', icon: <Settings className="w-8 h-8 accent" /> },
  ];

  return (
    <div className="min-h-screen bg-page text-page transition-colors">
      {/* Шапка */}
      <header className="bg-card/80 backdrop-blur-lg shadow-sm border-b border-page">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <h1 className="text-2xl font-bold">Клиника доктора Денисенко</h1>
            <button onClick={toggleDark} className="p-2 rounded-full bg-card border border-page">
              {dark ? <Sun className="accent" /> : <Moon className="accent" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
        <div className="bg-gradient-to-r from-orange-400 to-yellow-400 rounded-2xl p-8 text-white shadow-xl">
          Добро пожаловать, Администратор!
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((c, i) => (
            <div
              key={i}
              className="bg-card border border-page rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-center space-x-4">
                {c.icon}
                <div>
                  <p className="text-sm text-page/70">{c.title}</p>
                  <p className="text-2xl font-bold text-page">{c.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}