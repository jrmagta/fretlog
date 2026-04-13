import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { sessionsApi } from '../api/sessions';
import type { Session, Stats } from '../api/types';
import { parseDateStrip, formatMinutes, formatElapsed } from '../utils/dates';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Timer
  const [timerActive, setTimerActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quick log
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    duration_minutes: '',
    notes: '',
    reference_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState<'timer' | 'form' | null>(null);

  useEffect(() => {
    loadData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function loadData() {
    try {
      const [statsData, sessionsData] = await Promise.all([
        sessionsApi.stats(),
        sessionsApi.list(5, 0),
      ]);
      setStats(statsData);
      setSessions(sessionsData.data);
    } finally {
      setLoading(false);
    }
  }

  function flashSaved(source: 'timer' | 'form') {
    setJustSaved(source);
    setTimeout(() => setJustSaved(null), 2200);
  }

  // ── Timer ──────────────────────────────────────────────────────────────

  function startTimer() {
    startTimeRef.current = new Date();
    setElapsed(0);
    setTimerActive(true);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000));
    }, 1000);
  }

  async function stopTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerActive(false);

    const duration = Math.max(1, Math.round(elapsed / 60));
    const date = startTimeRef.current!.toISOString().split('T')[0];

    await sessionsApi.create({ date, duration_minutes: duration });
    setElapsed(0);
    startTimeRef.current = null;

    flashSaved('timer');
    await loadData();
  }

  // ── Quick log ──────────────────────────────────────────────────────────

  async function handleQuickLog(e: React.FormEvent) {
    e.preventDefault();
    const mins = parseInt(form.duration_minutes);
    if (!mins || mins < 1) return;

    setSubmitting(true);
    try {
      await sessionsApi.create({
        date: form.date,
        duration_minutes: mins,
        notes: form.notes || undefined,
        reference_url: form.reference_url || undefined,
      });
      setForm({ date: today, duration_minutes: '', notes: '', reference_url: '' });
      flashSaved('form');
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="dashboard">

      {/* ── Header ── */}
      <header className="dash-header">
        <div className="wordmark">
          <span className="wordmark-accent">F</span>RETLOG
          <div className="wordmark-sub">practice tracker</div>
        </div>

        <div className="stats-cluster">
          <div className="stat-item">
            <div className="stat-value">
              {stats === null ? '—' : stats.streak_days}
              {stats !== null && stats.streak_days > 0 && (
                <span className="streak-pip" aria-hidden>●</span>
              )}
            </div>
            <div className="stat-label">day streak</div>
          </div>

          <div className="stat-divider" aria-hidden />

          <div className="stat-item">
            <div className="stat-value">
              {stats === null ? '—' : formatMinutes(stats.week_minutes)}
            </div>
            <div className="stat-label">this week</div>
          </div>

          <div className="stat-divider" aria-hidden />

          <div className="stat-item">
            <div className="stat-value">
              {stats === null ? '—' : formatMinutes(stats.month_minutes)}
            </div>
            <div className="stat-label">this month</div>
          </div>
        </div>
      </header>

      {/* ── Main grid ── */}
      <div className="main-grid">

        {/* ── Left: Timer + Quick log ── */}
        <aside className="left-panel">

          {/* Timer */}
          <div className={`timer-card${timerActive ? ' timer-active' : ''}`}>
            <div className="timer-state-label">
              {timerActive ? 'Practicing' : 'Ready'}
            </div>
            <div className="timer-display">{formatElapsed(elapsed)}</div>
            <button
              className={`timer-btn ${timerActive ? 'timer-btn-stop' : 'timer-btn-start'}`}
              onClick={timerActive ? stopTimer : startTimer}
            >
              {timerActive ? 'End Session' : 'Start Practice'}
            </button>
            {justSaved === 'timer' && (
              <div className="saved-flash" aria-live="polite">Saved ✦</div>
            )}
          </div>

          {/* Quick log */}
          <div>
            <h2 className="section-heading">Log manually</h2>
            <form className="quicklog-form" onSubmit={handleQuickLog}>

              <div className="form-row-2">
                <div className="field">
                  <label className="field-label" htmlFor="ql-date">Date</label>
                  <input
                    id="ql-date"
                    type="date"
                    className="field-input"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="ql-dur">Minutes</label>
                  <input
                    id="ql-dur"
                    type="number"
                    className="field-input"
                    placeholder="45"
                    min="1"
                    value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="ql-notes">Notes</label>
                <input
                  id="ql-notes"
                  type="text"
                  className="field-input"
                  placeholder="What did you work on?"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="ql-url">Reference URL</label>
                <input
                  id="ql-url"
                  type="url"
                  className="field-input"
                  placeholder="https://..."
                  value={form.reference_url}
                  onChange={e => setForm(f => ({ ...f, reference_url: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className={`submit-btn${justSaved === 'form' ? ' btn-saved' : ''}`}
                disabled={submitting}
              >
                {submitting ? 'Saving…' : justSaved === 'form' ? 'Saved ✦' : 'Log Session'}
              </button>

            </form>
          </div>
        </aside>

        {/* ── Right: Recent sessions ── */}
        <section className="sessions-panel">
          <div className="sessions-panel-header">
            <h2 className="section-heading">Recent sessions</h2>
            <Link to="/sessions/new" className="new-session-link">+ New</Link>
          </div>

          {loading && (
            <div className="sessions-empty">Loading…</div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="sessions-empty">
              No sessions yet — start your first practice above.
            </div>
          )}

          {!loading && sessions.length > 0 && (
            <div className="sessions-list">
              {sessions.map((session, i) => {
                const { month, day } = parseDateStrip(session.date);
                return (
                  <article
                    key={session.id}
                    className="session-card"
                    style={{ animationDelay: `${i * 0.07}s` }}
                  >
                    <div className="session-date-strip">
                      <span className="session-month">{month}</span>
                      <span className="session-day">{day}</span>
                    </div>

                    <div className="session-body">
                      <div className="session-duration">
                        {formatMinutes(session.duration_minutes)}
                      </div>

                      {session.notes && (
                        <div className="session-notes">{session.notes}</div>
                      )}

                      {session.songs && session.songs.length > 0 && (
                        <div className="session-tags">
                          {session.songs.map(s => (
                            <span key={s.id} className="tag tag-song">{s.title}</span>
                          ))}
                        </div>
                      )}

                      {session.techniques && session.techniques.length > 0 && (
                        <div className="session-tags">
                          {session.techniques.map(t => (
                            <span key={t.id} className="tag tag-technique">{t.name}</span>
                          ))}
                        </div>
                      )}

                      {session.reference_url && (
                        <a
                          href={session.reference_url}
                          className="session-ref-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          reference ↗
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && (
            <div className="sessions-panel-footer">
              <Link to="/sessions" className="view-all-link">View all sessions →</Link>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
