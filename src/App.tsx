import React, { FormEvent, useEffect, useMemo, useState } from 'react';

type Doctor = {
  id: string;
  full_name: string;
  nc_user_id: string;
  room_token: string | null;
  room_name: string | null;
  is_active: number;
};

type Confirmation = {
  schedule_id: string;
  doctor_id: string;
  status: 'pending' | 'confirmed' | 'declined' | 'comment';
  responded_at: string | null;
  last_comment: string | null;
};

const defaultItem = {
  time: '09:00',
  patient: 'Иванов П.П.',
  procedure: 'Профгигиена',
  room: 'Кабинет 2',
  assistants: ['Анна', 'Елена'],
  duration: '60 мин',
  comment: 'Первичный прием',
};

const App = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorNcUserId, setDoctorNcUserId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusText, setStatusText] = useState('');

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === doctorId) ?? null,
    [doctors, doctorId],
  );

  const loadData = async () => {
    const [doctorsResp, confirmationsResp] = await Promise.all([
      fetch('/api/talk/doctors'),
      fetch('/api/talk/schedule/confirmations?limit=20'),
    ]);

    if (doctorsResp.ok) {
      const data = (await doctorsResp.json()) as Doctor[];
      setDoctors(data);
      if (!doctorId && data.length > 0) {
        setDoctorId(data[0].id);
      }
    }

    if (confirmationsResp.ok) {
      setConfirmations((await confirmationsResp.json()) as Confirmation[]);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const onSaveDoctor = async (e: FormEvent) => {
    e.preventDefault();
    setStatusText('Сохранение доктора...');

    const response = await fetch('/api/talk/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId,
        doctorName,
        doctorNcUserId,
        isActive: true,
      }),
    });

    if (!response.ok) {
      const payload = await response.json();
      setStatusText(`Ошибка: ${payload.error ?? 'Не удалось сохранить доктора'}`);
      return;
    }

    setStatusText('Доктор сохранен.');
    await loadData();
  };

  const onEnsureRoom = async () => {
    if (!doctorId) {
      setStatusText('Выберите doctorId.');
      return;
    }

    setStatusText('Создание / обновление комнаты Talk...');
    const response = await fetch(`/api/talk/doctors/${doctorId}/room`, { method: 'POST' });
    const payload = await response.json();

    if (!response.ok) {
      setStatusText(`Ошибка комнаты: ${payload.error ?? 'unknown error'}`);
      return;
    }

    setStatusText(`Комната готова: ${payload.roomName} (${payload.roomToken})`);
    await loadData();
  };

  const onSendSchedule = async () => {
    if (!doctorId || !scheduleId || !scheduleDate) {
      setStatusText('Укажите doctorId, scheduleId и дату.');
      return;
    }

    setStatusText('Отправка расписания врачу...');
    const response = await fetch('/api/talk/internal/send-schedule-to-talk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctorId,
        scheduleId,
        date: scheduleDate,
        items: [defaultItem],
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatusText(`Ошибка отправки: ${payload.error ?? 'unknown error'}`);
      return;
    }

    setStatusText(`Отправлено. Статус: ${payload.status}`);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold">Интеграция расписаний с Nextcloud Talk</h1>

        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">1) Справочник докторов</h2>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-4" onSubmit={onSaveDoctor}>
            <input className="input-field" placeholder="doctorId" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required />
            <input className="input-field" placeholder="doctorName" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} required />
            <input
              className="input-field"
              placeholder="doctorNcUserId"
              value={doctorNcUserId}
              onChange={(e) => setDoctorNcUserId(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">Сохранить доктора</button>
          </form>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th>ID</th>
                  <th>ФИО</th>
                  <th>NC user</th>
                  <th>roomToken</th>
                  <th>roomName</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="border-b">
                    <td>{doctor.id}</td>
                    <td>{doctor.full_name}</td>
                    <td>{doctor.nc_user_id}</td>
                    <td>{doctor.room_token ?? '—'}</td>
                    <td>{doctor.room_name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">2) Комната Talk + отправка расписания</h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={onEnsureRoom}>Создать/обновить комнату Talk</button>
            <input className="input-field" placeholder="scheduleId" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} />
            <input className="input-field" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            <button type="button" className="btn-primary" onClick={onSendSchedule}>Отправить расписание на подтверждение</button>
          </div>
          <p className="mt-2 text-sm text-gray-700">Выбранный доктор: {selectedDoctor ? `${selectedDoctor.full_name} (${selectedDoctor.id})` : 'не выбран'}</p>
          <p className="mt-2 text-sm text-gray-700">
            Endpoint отправки: <code>/api/talk/internal/send-schedule-to-talk</code>
          </p>
          <p className="mt-2 text-sm text-gray-700">
            Callback от бота: <code>/api/talk/schedule-response</code> (Bearer-токен обязателен).
          </p>
          <p className="mt-2 text-sm font-medium text-blue-700">{statusText}</p>
        </section>

        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">3) Статусы ответов врачей</h2>
          <ul className="space-y-2 text-sm">
            {confirmations.map((confirmation) => (
              <li key={confirmation.schedule_id} className="rounded border p-2">
                <b>{confirmation.schedule_id}</b> — {confirmation.status}
                <div>doctorId: {confirmation.doctor_id}</div>
                <div>respondedAt: {confirmation.responded_at ?? '—'}</div>
                <div>comment: {confirmation.last_comment ?? '—'}</div>
              </li>
            ))}
            {confirmations.length === 0 && <li>Пока нет записей.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default App;
