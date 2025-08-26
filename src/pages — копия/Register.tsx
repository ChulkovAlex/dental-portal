import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendRegistrationRequest } from '../api/sendRegistration';

export default function Register() {
  const [form, setForm] = useState({ email: '', name: '', role: 'reception' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sendRegistrationRequest(form);
    alert('Заявка отправлена. Проверьте почту.');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page text-page">
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-page rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">Регистрация</h2>
        <input
          required
          type="email"
          placeholder="E-mail"
          className="input-field"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          required
          placeholder="Имя"
          className="input-field"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="input-field"
        >
          <option value="reception">Регистратура</option>
          <option value="doctor">Врач</option>
          <option value="admin">Админ</option>
        </select>
        <button disabled={loading} className="btn-primary w-full">
          {loading ? 'Отправка...' : 'Отправить заявку'}
        </button>
      </form>
    </div>
  );
}