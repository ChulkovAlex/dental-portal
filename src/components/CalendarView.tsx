import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slot {
  id: string;
  time: string;
  patient: string | null;
  doctor: string;
  procedure: string;
}

const rooms = ['Кабинет 1', 'Кабинет 2', 'Кабинет 3'];

const generateSlots = (date: Date) => {
  const slots: Record<string, Slot[]> = {};
  rooms.forEach(room => {
    slots[room] = [
      { id: `${room}-09`, time: '09:00', patient: Math.random() > 0.6 ? 'Иванов И.И.' : null, doctor: 'Докт. Смирнов', procedure: 'Осмотр' },
      { id: `${room}-0930`, time: '09:30', patient: Math.random() > 0.6 ? 'Петрова А.В.' : null, doctor: 'Асс. Петрова', procedure: 'Гигиена' },
      { id: `${room}-10`, time: '10:00', patient: Math.random() > 0.6 ? 'Сидоров П.П.' : null, doctor: 'Докт. Лебедева', procedure: 'Пломбирование' },
    ];
  });
  return slots;
};

export default function CalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const slots = generateSlots(selectedDate);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;

  const shiftMonth = (dir: number) => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + dir);
    setSelectedDate(d);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* календарь */}
      <div className="bg-card border border-page rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-full bg-card"><ChevronLeft /></button>
          <h3 className="text-lg font-bold">{selectedDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-full bg-card"><ChevronRight /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div key={d} className="font-medium text-page/70">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
            const date = new Date(year, month, d);
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(date)}
                className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-orange-500 text-white' : isToday ? 'bg-orange-200 text-orange-800' : 'hover:bg-orange-100'}`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 столбца кабинетов */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Кабинет 1', 'Кабинет 2', 'Кабинет 3'].map(room => (
          <div key={room} className="bg-card border border-page rounded-xl shadow-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-center">{room}</h3>
            <div className="space-y-2">
              {(['09:00', '09:30', '10:00'] as const).map(time => {
                const slot = (generateSlots(selectedDate)[room] || []).find(s => s.time === time);
                return (
                  <div
                    key={`${room}-${time}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    <span className="font-medium text-sm">{time}</span>
                    <span className="text-xs text-page/80">{slot?.doctor ?? ''}</span>
                    <span
                      className="text-sm truncate cursor-help"
                      title={slot?.procedure ?? ''}
                    >
                      {slot?.patient ?? <span className="italic text-page/60">Свободно</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}