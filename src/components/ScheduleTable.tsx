import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Period = 'day' | 'week' | 'month' | '3m' | '6m' | 'year';

interface Slot {
  id: string;
  date: string;       // ISO
  time: string;
  patient: string | null;
  doctor: string;
  procedure: string;
}

const rooms = ['Кабинет 1', 'Кабинет 2', 'Кабинет 3'];

// генерация мок-данных
const generateMock = (period: Period, startDate: Date): Slot[] => {
  const slots: Slot[] = [];
  let days = 1;
  if (period === 'week') days = 7;
  if (period === 'month') days = 30;
  if (period === '3m') days = 90;
  if (period === '6m') days = 180;
  if (period === 'year') days = 365;

  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);

    rooms.forEach(room => {
      ['09:00', '09:30', '10:00', '10:30', '11:00'].forEach(time => {
        slots.push({
          id: `${date.toISOString()}-${room}-${time}`,
          date: date.toISOString(),
          time,
          patient: Math.random() > 0.6 ? `Пациент ${Math.floor(Math.random() * 100)}` : null,
          doctor: Math.random() > 0.5 ? 'Докт. Смирнов' : 'Асс. Петрова',
          procedure: 'Осмотр',
        });
      });
    });
  }
  return slots;
};

export default function ScheduleTable() {
  const [period, setPeriod] = useState<Period>('day');
  const [startDate, setStartDate] = useState(new Date());

  const slots = generateMock(period, startDate);

  const titles = {
    day: 'Сегодня',
    week: 'Неделя',
    month: 'Месяц',
    '3m': '3 месяца',
    '6m': 'Полгода',
    year: 'Год',
  };

  const changePeriod = (p: Period) => setPeriod(p);
  const shiftDate = (dir: number) => {
    const d = new Date(startDate);
    if (period === 'day') d.setDate(d.getDate() + dir);
    if (period === 'week') d.setDate(d.getDate() + dir * 7);
    if (period === 'month') d.setMonth(d.getMonth() + dir);
    if (period === '3m') d.setMonth(d.getMonth() + dir * 3);
    if (period === '6m') d.setMonth(d.getMonth() + dir * 6);
    if (period === 'year') d.setFullYear(d.getFullYear() + dir);
    setStartDate(d);
  };

  // группировка по дате
  const grouped = slots.reduce((acc, slot) => {
    const day = slot.date.slice(0, 10);
    acc[day] = acc[day] || {};
    acc[day][slot.time] = acc[day][slot.time] || [];
    acc[day][slot.time].push(slot);
    return acc;
  }, {} as Record<string, Record<string, Slot[]>>);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-page">{titles[period]}</h2>

      {/* переключатель периода */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['day', 'week', 'month', '3m', '6m', 'year'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => changePeriod(p)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-orange-500 text-white' : 'bg-card border border-page'}`}
          >
            {titles[p]}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => shiftDate(-1)} className="p-1 rounded bg-card"><ChevronLeft /></button>
          <span className="text-sm">{startDate.toLocaleDateString('ru-RU')}</span>
          <button onClick={() => shiftDate(1)} className="p-1 rounded bg-card"><ChevronRight /></button>
        </div>
      </div>

      {/* таблица */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-page">
            <tr>
              <th className="py-2">Дата</th>
              <th className="py-2">Время</th>
              <th className="py-2">Кабинет</th>
              <th className="py-2">Врач/Ассистент</th>
              <th className="py-2">Пациент</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([date, slotsByTime]) =>
              Object.entries(slotsByTime).map(([time, list]) =>
                list.map((slot) => (
                  <tr key={slot.id} className="border-b border-page/30">
                    <td className="py-2">{date}</td>
                    <td className="py-2">{time}</td>
                    <td className="py-2">
                      {rooms[Math.floor(Math.random() * rooms.length)]}
                    </td>
                    <td className="py-2">{slot.doctor}</td>
                    <td className="py-2">{slot.patient || <span className="italic">Свободно</span>}</td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}