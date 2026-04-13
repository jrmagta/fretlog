import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionsApi } from '../api/sessions';
import type { Session } from '../api/types';
import { parseDateStrip, formatMinutes } from '../utils/dates';
import './History.css';

const PAGE_SIZE = 20;

export default function History() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<Session | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  useEffect(() => {
    loadSessions();
  }, [offset]);

  async function loadSessions() {
    setLoading(true);
    try {
      const result = await sessionsApi.list(PAGE_SIZE, offset);
      setSessions(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(session: Session) {
    if (expandedId === session.id) {
      setExpandedId(null);
      setExpandedDetail(null);
      return;
    }
    setConfirmDeleteId(null);
    setExpandedId(session.id);
    setExpandedDetail(null);
    setExpandLoading(true);
    try {
      const detail = await sessionsApi.get(session.id);
      setExpandedDetail(detail);
    } finally {
      setExpandLoading(false);
    }
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    try {
      await sessionsApi.delete(id);
      setConfirmDeleteId(null);
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedDetail(null);
      }
      if (sessions.length === 1 && offset > 0) {
        setOffset(prev => prev - PAGE_SIZE);
      } else {
        await loadSessions();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="history-page">

      <header className="history-header">
        <Link to="/" className="history-wordmark">
          <span className="wordmark-accent">F</span>RETLOG
        </Link>
        <Link to="/sessions/new" className="new-session-link">+ New Session</Link>
      </header>

      <div className="history-content">

        <div className="history-title-row">
          <h1 className="history-title">Session History</h1>
          {!loading && (
            <span className="history-count">
              {total} {total === 1 ? 'session' : 'sessions'}
            </span>
          )}
        </div>

        {loading && <div className="sessions-empty">Loading…</div>}

        {!loading && sessions.length === 0 && (
          <div className="sessions-empty">
            No sessions yet —{' '}
            <Link to="/sessions/new" className="new-session-link">log your first one</Link>.
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div className="history-list">
            {sessions.map((session, i) => {
              const { month, day } = parseDateStrip(session.date);
              const isExpanded = expandedId === session.id;
              const isConfirming = confirmDeleteId === session.id;

              return (
                <article
                  key={session.id}
                  className={`history-row${isExpanded ? ' history-row-open' : ''}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >

                  <div className="history-row-main">
                    <button
                      className="history-expand-area"
                      onClick={() => toggleExpand(session)}
                      aria-expanded={isExpanded}
                    >
                      <div className="session-date-strip">
                        <span className="session-month">{month}</span>
                        <span className="session-day">{day}</span>
                      </div>
                      <div className="history-summary">
                        <span className="session-duration">
                          {formatMinutes(session.duration_minutes)}
                        </span>
                        {session.notes && (
                          <span className="history-notes-snippet">{session.notes}</span>
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
                      </div>
                      <span className={`history-chevron${isExpanded ? ' is-open' : ''}`} aria-hidden>
                        ›
                      </span>
                    </button>

                    <div className="history-actions">
                      <Link
                        to={`/sessions/${session.id}/edit`}
                        className="history-action-link"
                        onClick={e => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                      <button
                        className="history-delete-btn"
                        onClick={() => setConfirmDeleteId(isConfirming ? null : session.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isConfirming && (
                    <div className="history-confirm">
                      <span className="history-confirm-text">Delete this session?</span>
                      <button
                        className="history-confirm-yes"
                        onClick={() => handleDelete(session.id)}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        className="history-confirm-cancel"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="history-detail">
                      {expandLoading && (
                        <div className="history-detail-loading">Loading…</div>
                      )}
                      {!expandLoading && expandedDetail && (
                        <>
                          {expandedDetail.notes && (
                            <p className="history-detail-notes">{expandedDetail.notes}</p>
                          )}
                          {expandedDetail.songs && expandedDetail.songs.length > 0 && (
                            <div className="history-detail-section">
                              <span className="history-detail-label">Songs</span>
                              <div className="session-tags">
                                {expandedDetail.songs.map(s => (
                                  <span key={s.id} className="tag tag-song">{s.title}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {expandedDetail.techniques && expandedDetail.techniques.length > 0 && (
                            <div className="history-detail-section">
                              <span className="history-detail-label">Techniques</span>
                              <div className="session-tags">
                                {expandedDetail.techniques.map(t => (
                                  <span key={t.id} className="tag tag-technique">{t.name}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {expandedDetail.reference_url && (
                            <a
                              href={expandedDetail.reference_url}
                              className="session-ref-link"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              reference ↗
                            </a>
                          )}
                          {!expandedDetail.notes &&
                            (!expandedDetail.songs || expandedDetail.songs.length === 0) &&
                            (!expandedDetail.techniques || expandedDetail.techniques.length === 0) &&
                            !expandedDetail.reference_url && (
                              <span className="history-detail-empty">No additional details.</span>
                            )}
                        </>
                      )}
                    </div>
                  )}

                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="history-pagination">
            <button
              className="history-page-btn"
              disabled={offset === 0}
              onClick={() => setOffset(offset - PAGE_SIZE)}
            >
              ← Prev
            </button>
            <span className="history-page-info">{currentPage} / {totalPages}</span>
            <button
              className="history-page-btn"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
