import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, History, RefreshCcw, ThumbsDown } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import PortalHeader from '../components/PortalHeader';
import { useRegistration } from '../context/RegistrationContext';
import { useAuth } from '../context/AuthContext';

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function Reject() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { notice?: string } };
  const { currentUser } = useAuth();
  const { rejectedRequests, updateRequestStatus, getRequestById } = useRegistration();

  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pageNotice, setPageNotice] = useState<string | null>(location.state?.notice ?? null);

  useEffect(() => {
    if (location.state?.notice) {
      setPageNotice(location.state.notice);
      navigate(location.pathname, { replace: true, state: undefined });
    }
  }, [location, navigate]);

  const requestId = searchParams.get('request');
  const targetRequest = requestId ? getRequestById(requestId) ?? null : null;

  const sortedRejected = useMemo(
    () =>
      [...rejectedRequests].sort((a, b) => {
        const aTime = a.processedAt ? new Date(a.processedAt).getTime() : 0;
        const bTime = b.processedAt ? new Date(b.processedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [rejectedRequests],
  );

  const handleReject = (event: React.FormEvent) => {
    event.preventDefault();

    if (!targetRequest) {
      setError('Заявка не найдена или уже обработана.');
      return;
    }

    if (targetRequest.status !== 'pending') {
      setError('Эта заявка уже обработана.');
      return;
    }

    if (!reason.trim()) {
      setError('Укажите причину отказа, чтобы помочь сотруднику исправить ситуацию.');
      return;
    }

    setProcessing(true);
    setError(null);

    const updated = updateRequestStatus(targetRequest.id, 'rejected', {
      processedBy: currentUser?.email,
      note: reason.trim(),
    });

    setProcessing(false);

    if (!updated) {
      setError('Не удалось обновить статус заявки. Попробуйте позже.');
      return;
    }

    setReason('');
    navigate('/reject', {
      replace: true,
      state: {
        notice: `Заявка ${updated.fullName} отклонена. Информация отправлена ответственному лицу.`,
      },
    });
  };

  const handleRestore = (id: string) => {
    updateRequestStatus(id, 'pending');
    setPageNotice('Заявка возвращена в работу. Она снова появится в списке на одобрение.');
  };

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Журнал отказов"
        subtitle="Фиксируйте причины отказов и возвращайте заявки на повторное рассмотрение"
      />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        {pageNotice ? (
          <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <History className="mt-0.5 h-4 w-4" />
            <p>{pageNotice}</p>
          </div>
        ) : null}

        {targetRequest ? (
          <section className="rounded-2xl border border-page bg-card p-6 shadow-lg">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-page">Отклонить заявку</h2>
                <p className="text-sm text-page/60">
                  {targetRequest.fullName} · {targetRequest.email}
                </p>
              </div>
              <Link
                to="/approve"
                className="flex items-center gap-2 rounded-full border border-page px-3 py-1 text-xs font-semibold text-page transition hover:border-page/70 hover:bg-page/20"
              >
                <ArrowLeft className="h-3 w-3" /> К списку заявок
              </Link>
            </header>

            {targetRequest.status !== 'pending' ? (
              <p className="mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                Эта заявка уже была обработана. Проверьте журнал ниже или выберите другую заявку.
              </p>
            ) : (
              <form onSubmit={handleReject} className="mt-6 space-y-4">
                <label className="block text-sm font-medium text-page">
                  Причина отказа
                  <textarea
                    required
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={5}
                    placeholder="Опишите, что нужно исправить или предоставить сотруднику"
                    className="mt-1 w-full rounded-lg border border-page bg-card px-4 py-3 text-sm text-page shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                  />
                </label>

                {error ? (
                  <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={processing}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:from-red-600 hover:to-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ThumbsDown className="h-4 w-4" />
                  {processing ? 'Фиксируем решение...' : 'Отклонить заявку'}
                </button>
              </form>
            )}
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-page">История отказов</h2>
            <span className="text-xs text-page/60">{sortedRejected.length} записей</span>
          </div>

          {sortedRejected.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-page/70 bg-card/50 p-10 text-center text-sm text-page/60">
              Пока нет отклонённых заявок. Все решения будут отображаться здесь.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedRejected.map((request) => (
                <article
                  key={request.id}
                  className="rounded-2xl border border-page bg-card p-5 shadow-sm"
                >
                  <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-page">{request.fullName}</h3>
                      <p className="text-xs text-page/60">{request.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-page/60">
                      <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-600">Отклонено</span>
                      {request.processedAt ? <span>{formatDateTime(request.processedAt)}</span> : null}
                      {request.processedBy ? <span>Ответственный: {request.processedBy}</span> : null}
                    </div>
                  </header>

                  {request.decisionNote ? (
                    <p className="mt-3 rounded-xl border border-page bg-page/30 p-4 text-sm text-page/80 whitespace-pre-line">
                      {request.decisionNote}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-xs uppercase tracking-wide text-page/50">Действия</span>
                    <button
                      type="button"
                      onClick={() => handleRestore(request.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-page px-3 py-1 text-xs font-semibold text-page transition hover:border-orange-300 hover:bg-orange-50"
                    >
                      <RefreshCcw className="h-3 w-3" /> Вернуть в работу
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
