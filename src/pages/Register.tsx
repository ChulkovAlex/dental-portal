import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Mail, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useRegistration, RegistrationRole } from '../context/RegistrationContext';
import { useAuth } from '../context/AuthContext';

interface FormState {
  fullName: string;
  email: string;
  role: RegistrationRole;
  note: string;
}

const defaultState: FormState = {
  fullName: '',
  email: '',
  role: 'reception',
  note: '',
};

const roleLabels: Record<RegistrationRole, string> = {
  reception: 'Администратор ресепшена',
  doctor: 'Врач',
  assistant: 'Ассистент врача',
  admin: 'Управляющий клиники',
};

export default function Register() {
  const { createRequest, pendingRequests } = useRegistration();
  const { users } = useAuth();

  const [form, setForm] = useState<FormState>(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const existingUsersEmails = useMemo(
    () => new Set(users.map((user) => user.email.toLowerCase())),
    [users],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const normalizedEmail = form.email.trim().toLowerCase();

    if (existingUsersEmails.has(normalizedEmail)) {
      setError('Указанный e-mail уже зарегистрирован в системе. Обратитесь к администратору.');
      setIsSubmitting(false);
      return;
    }

    try {
      const request = createRequest({
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        note: form.note,
      });

      setForm(defaultState);
      setSuccessMessage(
        `Заявка №${request.id.slice(-6)} отправлена. Мы свяжемся по адресу ${request.email}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить заявку. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-page">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-10 px-4 py-12 md:flex-row md:items-center">
        <div className="space-y-6 md:w-1/2">
          <Link to="/" className="text-sm font-medium text-page/70 transition hover:text-page">
            ← Вернуться ко входу
          </Link>
          <h1 className="text-3xl font-bold">Запрос доступа к порталу клиники</h1>
          <p className="text-sm text-page/70">
            Заполните форму, чтобы отправить заявку на подключение к административному порталу. После проверки
            заявки мы пришлём инструкции на указанный e-mail.
          </p>
          <div className="rounded-2xl border border-dashed border-page/70 bg-card/50 p-6">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <UserPlus className="h-5 w-5 text-orange-500" /> Что подготовить?
            </h2>
            <ul className="list-disc space-y-2 pl-6 text-sm text-page/70">
              <li>E-mail, к которому у вас есть постоянный доступ.</li>
              <li>ФИО в соответствии с кадровыми документами.</li>
              <li>Комментарий для службы безопасности при необходимости.</li>
            </ul>
          </div>

          {pendingRequests.length ? (
            <p className="text-xs text-page/60">
              В очереди на рассмотрение: {pendingRequests.length}{' '}
              {pendingRequests.length === 1 ? 'заявка' : pendingRequests.length < 5 ? 'заявки' : 'заявок'}.
            </p>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="md:w-1/2"
        >
          <div className="space-y-4 rounded-2xl border border-page bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Форма запроса</h2>

            <label className="block text-sm font-medium text-page">
              Полное имя
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                placeholder="Например, Анастасия Денисенко"
                className="mt-1 w-full rounded-lg border border-page bg-card px-4 py-3 text-page shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <label className="block text-sm font-medium text-page">
              Рабочий e-mail
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="name@clinic.ru"
                className="mt-1 w-full rounded-lg border border-page bg-card px-4 py-3 text-page shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            <label className="block text-sm font-medium text-page">
              Роль в клинике
              <select
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as RegistrationRole }))}
                className="mt-1 w-full rounded-lg border border-page bg-card px-4 py-3 text-page shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-page">
              Дополнительная информация
              <textarea
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Опишите задачи или укажите ФИО наставника"
                rows={4}
                className="mt-1 w-full rounded-lg border border-page bg-card px-4 py-3 text-sm text-page shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </label>

            {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
            {successMessage ? (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-orange-600 hover:to-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {isSubmitting ? 'Отправляем заявку...' : 'Отправить заявку'}
            </button>

            <p className="text-xs text-page/60">
              Нажимая кнопку, вы подтверждаете согласие на обработку персональных данных в соответствии с политикой клиники.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
