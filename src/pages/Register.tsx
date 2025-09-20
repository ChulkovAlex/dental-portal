import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useDark } from '../hooks/useDark';
import { submitRegistrationRequest } from '../services/registration';
import type { UserRole } from '../services/authDb';

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'doctor', label: 'Врач', description: 'Записи, расписание, назначения' },
  { value: 'assistant', label: 'Ассистент', description: 'Помощь врачу, подготовка кабинета' },
  { value: 'reception', label: 'Регистратура', description: 'Звонки пациентам и подтверждения' },
  { value: 'admin', label: 'Администратор', description: 'Полный доступ и управление пользователями' },
];

const INITIAL_ROLE: UserRole = 'doctor';

export default function Register() {
  const [dark, toggleDark] = useDark();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(INITIAL_ROLE);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole(INITIAL_ROLE);
    setComment('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await submitRegistrationRequest({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        comment: comment.trim() ? comment.trim() : undefined,
      });
      setIsSuccess(true);
      resetForm();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось отправить заявку. Попробуйте ещё раз.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-page text-page relative">
      <button
        onClick={toggleDark}
        type="button"
        className="absolute top-4 right-4 p-2 rounded-full bg-card border border-page"
      >
        <span className="text-xl">{dark ? '🌙' : '☀️'}</span>
      </button>

      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 space-y-2">
          <div className="flex justify-center">
            <img src="/logo.png" alt="Doc Denisenko" className="h-16 w-auto rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold">Запрос доступа к порталу</h1>
          <p className="text-sm text-page/70">
            Оставьте заявку, и администратор клиники подтвердит доступ. Вы получите письмо с результатом.
          </p>
        </div>

        <div className="bg-card border border-page rounded-2xl shadow-xl p-8 space-y-6">
          {isSuccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✅
              </div>
              <h2 className="text-2xl font-semibold">Заявка отправлена!</h2>
              <p className="text-sm text-page/70">
                Мы отправили уведомление администратору. Как только заявка будет обработана, вы получите письмо на указанный
                адрес.
              </p>
              <p className="text-xs text-page/50">
                Если письмо не пришло в течение рабочего дня, напишите нам на <a href="mailto:caldv@docdenisenko.ru" className="accent underline">caldv@docdenisenko.ru</a>.
              </p>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-3 font-semibold text-white shadow-md hover:from-orange-600 hover:to-yellow-600"
              >
                Вернуться к входу
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-left">
                  <span className="text-sm font-medium text-page">Ваше имя</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Например, Анна Смирнова"
                    className="input-field"
                  />
                </label>
                <label className="space-y-2 text-left">
                  <span className="text-sm font-medium text-page">Рабочая почта</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@clinic.ru"
                    className="input-field"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <span className="text-sm font-medium text-page">Роль в клинике</span>
                <div className="grid gap-3 md:grid-cols-2">
                  {ROLE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border p-4 transition shadow-sm hover:shadow-md ${
                        role === option.value ? 'border-orange-400 bg-orange-50/70' : 'border-page bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p className="text-xs text-page/60">{option.description}</p>
                        </div>
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={role === option.value}
                          onChange={() => setRole(option.value)}
                          className="accent-orange-500"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-2 text-left">
                <span className="text-sm font-medium text-page">Комментарий (необязательно)</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Расскажите, в каком отделе вы работаете или кто может подтвердить заявку"
                  className="input-field min-h-[120px] resize-y"
                />
              </label>

              {error ? <p className="text-sm text-red-500 text-center">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 py-3 font-semibold text-white shadow-md hover:from-orange-600 hover:to-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Отправляем...' : 'Отправить заявку'}
              </button>

              <p className="text-xs text-center text-page/60">
                Уже есть доступ? <Link to="/" className="accent underline">Вернитесь на страницу входа</Link>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
