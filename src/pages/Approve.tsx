import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Clock4,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import PortalHeader from '../components/PortalHeader';
import { useRegistration } from '../context/RegistrationContext';
import { useAuth, AuthError } from '../context/AuthContext';

const roleDescriptions: Record<string, string> = {
  reception: 'Администратор ресепшена',
  doctor: 'Врач',
  assistant: 'Ассистент врача',
  admin: 'Управляющий клиники',
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const generatePassword = (length = 10) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
  let password = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * alphabet.length);
    password += alphabet[randomIndex];
  }
  return password;
};

export default function Approve() {
  const { pendingRequests, approvedRequests, updateRequestStatus } = useRegistration();
  const { createUser, currentUser } = useAuth();

  const sortedPending = useMemo(
    () => [...pendingRequests].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [pendingRequests],
  );

  const [selectedId, setSelectedId] = useState<string | null>(sortedPending[0]?.id ?? null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedId && sortedPending[0]) {
      setSelectedId(sortedPending[0].id);
      return;
    }

    if (selectedId && !sortedPending.some((request) => request.id === selectedId)) {
      setSelectedId(sortedPending[0]?.id ?? null);
    }
  }, [selectedId, sortedPending]);

  const selectedRequest = sortedPending.find((request) => request.id === selectedId) ?? null;

  const recentApprovals = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return approvedRequests.filter((request) => {
      if (!request.processedAt) {
        return false;
      }
      return new Date(request.processedAt).getTime() >= weekAgo;
    });
  }, [approvedRequests]);

  const handleApprove = async () => {
    if (!selectedRequest) {
      return;
    }

    setProcessing(true);
    setError(null);
    setIssuedCredentials(null);

    try {
      const password = generatePassword();
      const createdUser = await createUser({
        email: selectedRequest.email,
        role: selectedRequest.role,
        password,
        name: selectedRequest.fullName,
        requirePasswordSetup: false,
      });

      updateRequestStatus(selectedRequest.id, 'approved', {
        processedBy: currentUser?.email,
        note: 'Создана учетная запись в портале',
        assignedUserId: createdUser.id,
      });

      setIssuedCredentials({
        email: selectedRequest.email,
        password,
        name: selectedRequest.fullName,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'user-already-exists') {
          setError('Пользователь с таким e-mail уже существует. Проверьте журнал отказов или свяжитесь с сотрудником.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Не удалось выдать доступ. Попробуйте позже.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Управление заявками"
        subtitle="Проверяйте запросы сотрудников и выдавайте доступ в пару кликов"
      />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Clock4 className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-page/60">Ожидают рассмотрения</p>
                <p className="text-2xl font-semibold text-page">{pendingRequests.length}</p>
              </div>
            </div>
          </article>
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-page/60">Одобрено за 7 дней</p>
                <p className="text-2xl font-semibold text-page">{recentApprovals.length}</p>
              </div>
            </div>
          </article>
          <article className="rounded-2xl border border-page bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-sky-500" />
              <div>
                <p className="text-xs uppercase tracking-wide text-page/60">Всего обработано</p>
                <p className="text-2xl font-semibold text-page">{approvedRequests.length}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <aside className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-page">Заявки</h2>
              <span className="text-xs text-page/60">{sortedPending.length} активных</span>
            </div>

            <div className="space-y-3">
              {sortedPending.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-page/70 bg-card/50 p-6 text-center text-sm text-page/60">
                  Все заявки обработаны. Новые появятся здесь автоматически.
                </div>
              ) : (
                sortedPending.map((request) => {
                  const isActive = request.id === selectedId;
                  return (
                    <button
                      type="button"
                      key={request.id}
                      onClick={() => setSelectedId(request.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                        isActive
                          ? 'border-orange-400 bg-orange-50 text-page'
                          : 'border-page bg-card text-page hover:border-orange-200 hover:bg-orange-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{request.fullName}</span>
                        <span className="text-xs text-page/60">{formatDateTime(request.createdAt)}</span>
                      </div>
                      <p className="text-xs text-page/60">
                        {roleDescriptions[request.role] ?? request.role}
                      </p>
                      {request.note ? (
                        <p className="mt-2 text-xs text-page/70 line-clamp-2">{request.note}</p>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="space-y-4">
            {selectedRequest ? (
              <div className="space-y-4 rounded-2xl border border-page bg-card p-6 shadow-lg">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-page">{selectedRequest.fullName}</h2>
                    <p className="text-sm text-page/60">{selectedRequest.email}</p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-600">
                    {roleDescriptions[selectedRequest.role] ?? selectedRequest.role}
                  </span>
                </header>

                <dl className="grid gap-3 text-sm text-page/80 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-page/50">Получено</dt>
                    <dd>{formatDateTime(selectedRequest.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-page/50">Инициатор</dt>
                    <dd>{selectedRequest.note ? 'Оставлен комментарий' : 'Комментарий не указан'}</dd>
                  </div>
                </dl>

                {selectedRequest.note ? (
                  <div className="rounded-xl border border-page bg-page/30 p-4 text-sm text-page/80">
                    <p className="font-semibold text-page">Комментарий заявителя</p>
                    <p className="mt-2 whitespace-pre-line">{selectedRequest.note}</p>
                  </div>
                ) : null}

                {issuedCredentials ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <p className="flex items-center gap-2 font-semibold">
                      <BadgeCheck className="h-4 w-4" /> Доступ выдан
                    </p>
                    <p className="mt-2">Передайте сотруднику временный пароль:</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700">
                      <span>{issuedCredentials.email}</span>
                      <span className="rounded bg-emerald-600 px-2 py-1 text-white">{issuedCredentials.password}</span>
                    </div>
                    <p className="mt-2 text-xs text-emerald-700/80">
                      В целях безопасности пароль не сохраняется в системе. Смените его при первом входе.
                    </p>
                  </div>
                ) : null}

                {error ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <p>{error}</p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    {processing ? 'Выдаём доступ...' : 'Одобрить и создать аккаунт'}
                  </button>
                  <Link
                    to={`/reject?request=${selectedRequest.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-page px-4 py-3 text-sm font-semibold text-page transition hover:border-red-300 hover:bg-red-50"
                  >
                    Отклонить заявку <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-page/70 bg-card/50 p-10 text-center text-sm text-page/60">
                Выберите заявку из списка, чтобы просмотреть детали и принять решение.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
