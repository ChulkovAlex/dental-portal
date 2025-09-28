import React, { useEffect, useState } from 'react';

interface StaffMember {
  id: number;
  name: string;
}

interface StaffData {
  doctors: StaffMember[];
  assistants: StaffMember[];
}

export default function StaffList() {
  const [staff, setStaff] = useState<StaffData>({ doctors: [], assistants: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff');
        if (!response.ok) {
          throw new Error('Не удалось загрузить сотрудников');
        }
        const data: StaffData = await response.json();
        setStaff(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (error) {
    return <div className="text-red-500">Ошибка: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold mb-2">Врачи</h2>
        <ul className="space-y-2">
          {staff.doctors.map(doc => (
            <li key={doc.id} className="bg-card p-4 rounded-lg shadow">
              {doc.name}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Ассистенты</h2>
        <ul className="space-y-2">
          {staff.assistants.map(assistant => (
            <li key={assistant.id} className="bg-card p-4 rounded-lg shadow">
              {assistant.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

