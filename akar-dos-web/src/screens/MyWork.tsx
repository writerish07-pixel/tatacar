import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { ApiError, fetchMyWork, type MyWork as MyWorkData, type Task } from '../api';
import { EmptyState, ErrorState, LoadingState } from '../components/states';

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; data: MyWorkData };

/** My Work — the home screen. The system tells the user what to do next. */
export function MyWork() {
  const { user, logout } = useAuth();
  const [state, setState] = useState<LoadState>({ phase: 'loading' });

  const load = useCallback(async () => {
    setState({ phase: 'loading' });
    try {
      const data = await fetchMyWork();
      setState({ phase: 'ready', data });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not load your work.';
      setState({ phase: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>AKAR DOS</strong> <span className="topbar__sep">·</span> My Work
        </div>
        <div className="topbar__user">
          <span>
            {user?.name} ({user?.role})
          </span>
          <button type="button" className="btn btn--ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="content">
        {state.phase === 'loading' ? <LoadingState label="Loading your work…" /> : null}
        {state.phase === 'error' ? <ErrorState message={state.message} onRetry={() => void load()} /> : null}
        {state.phase === 'ready' ? <MyWorkBuckets data={state.data} /> : null}
      </main>
    </div>
  );
}

function MyWorkBuckets({ data }: { data: MyWorkData }) {
  const total =
    data.actionRequired.length + data.overdue.length + data.dueToday.length + data.completedToday.length;

  if (total === 0) {
    return (
      <EmptyState
        title="You're all caught up"
        message="No tasks assigned right now. New work will appear here automatically."
      />
    );
  }

  return (
    <div className="buckets">
      <Bucket title="Action required" tone="primary" tasks={data.actionRequired} />
      <Bucket title="Overdue" tone="danger" tasks={data.overdue} />
      <Bucket title="Due today" tone="warning" tasks={data.dueToday} />
      <Bucket title="Completed today" tone="success" tasks={data.completedToday} />
    </div>
  );
}

function Bucket({ title, tone, tasks }: { title: string; tone: string; tasks: Task[] }) {
  return (
    <section className={`bucket bucket--${tone}`}>
      <h2>
        {title} <span className="bucket__count">{tasks.length}</span>
      </h2>
      {tasks.length === 0 ? (
        <p className="bucket__empty">Nothing here.</p>
      ) : (
        <ul>
          {tasks.map((t) => (
            <li key={t.id} className="task">
              <span className={`task__priority task__priority--${t.priority.toLowerCase()}`} />
              <div>
                <div className="task__title">{t.title}</div>
                {t.description ? <div className="task__desc">{t.description}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
