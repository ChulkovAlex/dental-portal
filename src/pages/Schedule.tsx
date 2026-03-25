import React from 'react';
import { CalendarSync, RefreshCw } from 'lucide-react';

import CalendarView from '../components/CalendarView';
import PortalHeader from '../components/PortalHeader';
import ScheduleTable from '../components/ScheduleTable';
import { ScheduleProvider, useSchedule } from '../context/ScheduleContext';

const formatSyncDate = (iso?: string) => {
  if (!iso) {
    return 'ещё не выполнялась';
  }

  return new Date(iso).toLocaleString('ru-RU');
};

export default function Schedule() {
  return (
    <ScheduleProvider>
      <ScheduleContent />
    </ScheduleProvider>
  );
}

function ScheduleContent() {
  const {
    identSyncIntervalValue,
    identSyncIntervalUnit,
    identSyncInProgress,
    identLastSyncAt,
    identSyncError,
    setIdentSyncInterval,
    syncWithIdent,
  } = useSchedule();

  return (
    <div className="min-h-screen bg-page text-page">
      <PortalHeader
        title="Расписание"
        subtitle="Отдельная вкладка с календарём и синхронизацией iDent"
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:space-y-8 md:py-10">
        <section className="rounded-2xl border border-page bg-card p-4 shadow-lg md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold md:text-xl">Синхронизация с iDent</h2>
              <p className="text-sm text-page/70">
                Последняя синхронизация: {formatSyncDate(identLastSyncAt)}
              </p>
              {identSyncError ? (
                <p className="mt-1 text-xs font-medium text-rose-500">{identSyncError}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-page/70" htmlFor="sync-interval">Интервал:</label>
              <input
                id="sync-interval"
                min={5}
                max={120}
                type="number"
                value={identSyncIntervalValue}
                onChange={(event) =>
                  setIdentSyncInterval(Number(event.target.value || 5), identSyncIntervalUnit)
                }
                className="w-20 rounded-xl border border-page bg-page px-3 py-2 text-sm text-page"
              />
              <select
                value={identSyncIntervalUnit}
                onChange={(event) =>
                  setIdentSyncInterval(
                    identSyncIntervalValue,
                    event.target.value === 'seconds' ? 'seconds' : 'minutes',
                  )
                }
                className="rounded-xl border border-page bg-page px-3 py-2 text-sm text-page"
              >
                <option value="seconds">секунд</option>
                <option value="minutes">минут</option>
              </select>
              <button
                type="button"
                onClick={() => void syncWithIdent()}
                disabled={identSyncInProgress}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {identSyncInProgress ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarSync className="h-4 w-4" />
                )}
                Синхронизировать сейчас
              </button>
            </div>
          </div>
        </section>

        <ScheduleTable />
        <CalendarView />
      </main>
    </div>
  );
}
