import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EventMap {
  [date: string]: string[];
}

// Sample events for demonstration purposes
const sampleEvents: EventMap = {
  // format: YYYY-MM-DD
  [new Date().toISOString().slice(0, 10)]: ['Проверка оборудования', 'Обед с коллегами'],
};

export default function DynamicCalendar() {
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday as first day

  const days: (number | null)[] = Array.from({ length: startOffset }, () => null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const changeMonth = (dir: number) => {
    const d = new Date(year, month + dir, 1);
    setCurrent(d);
  };

  const formatKey = (d: Date) => d.toISOString().slice(0, 10);

  const events = selected ? sampleEvents[formatKey(selected)] || [] : [];

  return (
    <div className="max-w-xl mx-auto bg-card border border-page rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-full hover:bg-page/20"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft />
        </button>
        <h2 className="font-semibold">
          {current.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
        </h2>
        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-full hover:bg-page/20"
          aria-label="Следующий месяц"
        >
          <ChevronRight />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-sm mb-4">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="text-page/60 font-medium">
            {d}
          </div>
        ))}
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const date = new Date(year, month, d);
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = selected && date.toDateString() === selected.toDateString();
          return (
            <button
              key={i}
              onClick={() => setSelected(date)}
              className={`p-2 rounded-lg hover:bg-orange-100 transition-colors ${
                isSelected ? 'bg-orange-500 text-white' : ''
              } ${
                isToday && !isSelected ? 'border border-orange-500' : ''
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-4 text-sm">
          <h3 className="font-medium mb-2">
            События на {selected.toLocaleDateString('ru-RU')}
          </h3>
          {events.length ? (
            <ul className="list-disc list-inside space-y-1">
              {events.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          ) : (
            <p className="text-page/60">Нет событий</p>
          )}
        </div>
      )}
    </div>
  );
}

