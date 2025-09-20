import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth, AuthError } from '../context/AuthContext';
import type { UserRole } from '../services/authDb';
import { notifyRegistrationDecision } from '../services/registration';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Администратор',
  doctor: 'Врач',
  assistant: 'Ассистент',
  reception: 'Регистратура',
};

const isValidEmail = (value: string | null) =>
  !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());

const normalizeRole = (value: string | null): UserRole => {
  if (value === 'admin' || value === 'assistant' || value === 'reception') {
    return value;
  }
  return 'doctor';
};

export default function Approve() {
  const [searchParams] = useSearchParams();
  const { currentUser, createUserInvite } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const email = useMemo(() => searchParams.get('email'), [searchParams]);
  const name = useMemo(() => searchParams.get('name') ?? '', [searchParams]);
  const role = useMemo(() => normalizeRole(searchParams.get('role')), [searchParams]);
  const comment = useMemo(() => searchParams.get('comment') ?? '', [searchParams]);

  const isAdmin = currentUser?.role === 'admin';
  const emailValid = isValidEmail(email);
  const validationError = !isAdmin
    ? 'Только администратор может одобрять заявки.'
    : !emailValid
      ? 'Некорректный адрес электронной почты в ссылке.'
      : null;
  const canApprove = !validationError && !isDone;

  const handleApprove = async () => {
    if (!email || validationError) {
      setError(validationError ?? 'Не удалось определить адрес электронной почты.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await createUserInvite({
        email,
        role,
        name: name || undefined,
      });

      await notifyRegistrationDecision({
        email,
        name,
        role,
        status: 'approved',
      });

      setIsDone(true);
    } catch (err) {
      if (err instanceof AuthError && err.code === 'user-already-exists') {
        setError('Пользователь с таким e-mail уже существует. Возможно, заявка уже была обработана.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось обработать заявку. Попробуйте снова.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-page flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="rounded-3xl border border-page bg-card p-8 shadow-xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold">Одобрение доступа</h1>
            <p className="text-sm text-page/70">
              Проверьте данные сотрудника и подтвердите создание учётной записи.
            </p>
          </div>

          <div className="rounded-2xl border border-page/70 bg-card/80 p-6 shadow-inner space-y-4">
            <DetailRow label="Имя" value={name || 'Не указано'} />
            <DetailRow label="E-mail" value={email ?? 'Не указан'} />
            <DetailRow label="Роль" value={ROLE_LABELS[role]} />
            {comment ? <DetailRow label="Комментарий" value={comment} /> : null}
          </div>

          {error || validationError ? (
            <p className="text-sm text-red-500 text-center">{error ?? validationError}</p>
          ) : null}

          {isDone ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                ✅
              </div>
              <h2 className="text-xl font-semibold">Доступ подтверждён</h2>
              <p className="text-sm text-page/70">
                Мы уведомили сотрудника по электронной почте. Учётная запись создана и ожидает установку пароля при первом входе.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-3 font-semibold text-white shadow-md hover:from-orange-600 hover:to-yellow-600"
              >
                Вернуться в портал
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <Link to="/dashboard" className="text-sm text-page/60 underline">
                Отменить и вернуться
              </Link>
              <button
                type="button"
                onClick={handleApprove}
                disabled={!canApprove || isProcessing}
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 font-semibold text-white shadow-md hover:from-emerald-600 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Подтверждаем...' : 'Одобрить доступ'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value }) => (
  <div className="flex flex-col rounded-xl border border-page/40 bg-card/60 px-4 py-3 text-left">
    <span className="text-xs uppercase tracking-wide text-page/50">{label}</span>
    <span className="text-sm font-medium text-page">{value}</span>
  </div>
);
