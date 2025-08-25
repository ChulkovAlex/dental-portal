import React from 'react';
import {
  CalendarDays,
  Users,
  BarChart2,
  Settings,
  Bell,
  Moon,
  Sun,
} from 'lucide-react';

export default function Dashboard() {
  const cards = [
    {
      title: 'Расписание',
      value: '12 слотов',
      icon: <CalendarDays className="w-8 h-8 text-orange-600" />,
      color: 'from-orange-50 to-orange-100',
    },
    {
      title: 'Врачи',
      value: '8 онлайн',
      icon: <Users className="w-8 h-8 text-orange-600" />,
      color: 'from-amber-50 to-amber-100',
    },
    {
      title: 'Аналитика',
      value: '↑ 14 %',
      icon: <BarChart2 className="w-8 h-8 text-orange-600" />,
      color: 'from-yellow-50 to-yellow-100',
    },
    {
      title: 'Настройки',
      value: '3 увед.',
      icon: <Settings className="w-8 h-8 text-orange-600" />,
      color: 'from-red-50 to-red-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50">
      {/* Шапка */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <img
                src="https://docdenisenko.ru/logo.png"
                alt="Doc Denisenko"
                className="h-12 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-800">
                Клиника доктора Денисенко
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-orange-100">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-full hover:bg-orange-100">
                <Moon className="w-5 h-5 text-gray-600" />
              </button>
              <img
                className="h-10 w-10 rounded-full ring-2 ring-orange-200"
                src="https://placehold.co/100x100?text=А"
                alt="Аватар"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Основная область */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Баннер-приветствие */}
        <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-400 rounded-2xl p-8 mb-8 text-white shadow-xl">
          <h2 className="text-3xl font-extrabold mb-2">
            Добро пожаловать, Администратор!
          </h2>
          <p className="text-orange-100 text-lg">
            Управляйте расписанием, врачами и аналитикой в одном месте.
          </p>
        </div>

        {/* Грид карточек */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((c) => (
            <div
              key={c.title}
              className={`card bg-gradient-to-br ${c.color} border-l-4 border-orange-500`}
            >
              <div className="flex items-center space-x-4">
                {c.icon}
                <div>
                  <p className="text-sm text-gray-600">{c.title}</p>
                  <p className="text-2xl font-bold text-gray-800">{c.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Быстрый доступ */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Быстрый доступ
          </h3>
          <div className="flex flex-wrap gap-4">
            <button className="btn-primary flex items-center space-x-2">
              <CalendarDays className="w-5 h-5" />
              <span>Открыть расписание</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Управление врачами</span>
            </button>
            <button className="btn-primary flex items-center space-x-2">
              <BarChart2 className="w-5 h-5" />
              <span>Смотреть аналитику</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}