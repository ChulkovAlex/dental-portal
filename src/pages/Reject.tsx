import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
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

export default function Reject() {
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const email = useMemo(() => searchParams.get('email'), [searchParams]);
  const name = useMemo(() => searchParams.get('name') ?? '', [searchParams]);
  const role = useMemo(() => normalizeRole(searchParams.get('role')), [searchParams]);
  const comment = useMemo(() => searchParams.get('comment') ?? '', [searchParams]);

  const isAdmin = currentUser?.role === 'admin';
  const emailValid = isValidEmail(email);
  const validationError = !isAdmin
    ? 'Только администратор может отклонять заявки.'
    : !emailValid
      ? 'Некорректный адрес электронной почты в ссылке.'
      : null;
  const canReject = !validationError && !isDone;

  const handleReject = async () => {
    if (!email || validationError) {
      setError(validationError ?? 'Не удалось определить адрес электронной почты.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await notifyRegistrationDecision({
        email,
        name,
        role,
        status: 'rejected',
        comment: note.trim() ? note.trim() : undefined,
      });
      setIsDone(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Не удалось отправить уведомление. Попробуйте снова.');
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
            <h1 className="text-3xl font-semibold">Отклонение заявки</h1>
            <p className="text-sm text-page/70">
              Укажите причину и отправьте уведомление сотруднику.
            </p>
          </div>

          <div className="rounded-2xl border border-page/70 bg-card/80 p-6 shadow-inner space-y-4">
            <DetailRow label="Имя" value={name || 'Не указано'} />
            <DetailRow label="E-mail" value={email ?? 'Не указан'} />
            <DetailRow label="Роль" value={ROLE_LABELS[role]} />
            {comment ? <DetailRow label="Комментарий" value={comment} /> : null}
          </div>

          {isDone ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                ⚠️
              </div>
              <h2 className="text-xl font-semibold">Заявка отклонена</h2>
              <p className="text-sm text-page/70">
                Сообщение отправлено на указанный адрес. При необходимости вы всегда можете пригласить сотрудника повторно.
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-3 font-semibold text-white shadow-md hover:from-orange-600 hover:to-yellow-600"
              >
                Вернуться в портал
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="space-y-2 text-left">
                <span className="text-sm font-medium text-page">Сообщение для сотрудника (необязательно)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Например, заявка отправлена не с рабочей почты или требуется дополнительное согласование"
                  className="input-field min-h-[120px] resize-y"
                />
              </label>

              {error || validationError ? (
                <p className="text-sm text-red-500 text-center">{error ?? validationError}</p>
              ) : null}

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <Link to="/dashboard" className="text-sm text-page/60 underline">
                  Отменить и вернуться
                </Link>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!canReject || isProcessing}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-3 font-semibold text-white shadow-md hover:from-rose-600 hover:to-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Отправляем...' : 'Отклонить заявку'}
                </button>
              </div>
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
