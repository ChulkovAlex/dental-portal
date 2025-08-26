import React, { useState } from 'react';
import { Settings, UserPlus, Save, Trash2 } from 'lucide-react';
import { useDark } from '../hooks/useDark';

interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'doctor' | 'reception';
  active: boolean;
}

export default function SettingsMenu() {
  const [dark] = useDark();
  const [tab, setTab] = useState<'profile' | 'users'>('profile');

  // мок-данные
  const [users, setUsers] = useState<User[]>([
    { id: 1, username: 'admin', name: 'Администратор', role: 'admin', active: true },
    { id: 2, username: 'doctor1', name: 'Иванов И.И.', role: 'doctor', active: true },
  ]);

  const addUser = () => {
    const newUser: User = {
      id: Date.now(),
      username: 'new' + Date.now(),
      name: 'Новый сотрудник',
      role: 'reception',
      active: true,
    };
    setUsers([...users, newUser]);
  };

  const toggleUser = (id: number) => {
    setUsers(users.map(u => (u.id === id ? { ...u, active: !u.active } : u)));
  };

  const deleteUser = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto bg-card border border-page rounded-2xl shadow-lg p-6 space-y-6">
      {/* Вкладки */}
      <div className="flex space-x-4 border-b border-page pb-3">
        <button
          onClick={() => setTab('profile')}
          className={`font-medium ${tab === 'profile' ? 'accent' : 'text-page/60'}`}
        >
          Личные настройки
        </button>
        <button
          onClick={() => setTab('users')}
          className={`font-medium ${tab === 'users' ? 'accent' : 'text-page/60'}`}
        >
          Пользователи
        </button>
      </div>

      {tab === 'profile' && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold text-page">Профиль</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="input-field"
              placeholder="Имя"
              defaultValue="Администратор"
            />
            <input
              className="input-field"
              placeholder="Email"
              defaultValue="admin@clinic.ru"
            />
            <input
              className="input-field"
              type="password"
              placeholder="Новый пароль"
            />
            <input
              className="input-field"
              type="password"
              placeholder="Повторите пароль"
            />
          </div>
          <button className="btn-primary">
            <Save className="w-4 h-4 mr-2" /> Сохранить
          </button>
        </section>
      )}

      {tab === 'users' && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-page">Пользователи</h3>
            <button onClick={addUser} className="btn-primary">
              <UserPlus className="w-4 h-4 mr-2" /> Добавить
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-page">
                <tr>
                  <th className="py-2">Имя</th>
                  <th className="py-2">Логин</th>
                  <th className="py-2">Роль</th>
                  <th className="py-2 text-center">Доступ</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-page/30">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2">{u.username}</td>
                    <td className="py-2">{u.role}</td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={u.active}
                        onChange={() => toggleUser(u.id)}
                        className="accent-orange-500"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}	