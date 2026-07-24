import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { adminApi, type AdminReport } from '../../services/adminApi';
import type { ReportReason } from '../../services/reportsApi';
import './Admin.css';

type TypeFilter = 'all' | 'review' | 'comment';
type StatusFilter = 'all' | 'Open' | 'Resolved' | 'Dismissed';
type ReasonFilter = 'all' | ReportReason;

/**
 * Admin report queue (User Story 8). Loads every report (across statuses) so the header tiles are
 * accurate, then lets the Admin filter the list and either remove the reported content or dismiss
 * the report. The default view is the open queue.
 */
export function AdminReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Open');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [search, setSearch] = useState('');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // Pull all three statuses so the tiles reflect the whole queue, not just what's open.
      const [open, resolved, dismissed] = await Promise.all([
        adminApi.listReports('Open', token),
        adminApi.listReports('Resolved', token),
        adminApi.listReports('Dismissed', token),
      ]);
      setReports([...open, ...resolved, ...dismissed]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load reports.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function resolve(report: AdminReport, action: 'RemoveContent' | 'Dismiss') {
    if (action === 'RemoveContent' && !window.confirm('Remove the reported content?')) {
      return;
    }
    setBusyId(report.id);
    setErrorMessage('');
    try {
      await adminApi.resolveReport(report.id, action, token);
      await loadReports();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The action failed. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  const counts = useMemo(
    () => ({
      reviews: reports.filter((r) => r.reviewId).length,
      comments: reports.filter((r) => r.commentId).length,
      pending: reports.filter((r) => r.status === 'Open').length,
      dismissed: reports.filter((r) => r.status === 'Dismissed').length,
    }),
    [reports],
  );

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (typeFilter === 'review' && !r.reviewId) return false;
      if (typeFilter === 'comment' && !r.commentId) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (reasonFilter !== 'all' && r.reason !== reasonFilter) return false;
      if (term) {
        const haystack = `${r.targetText ?? ''} ${r.reporterDisplayName ?? ''} ${r.reason}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [reports, typeFilter, statusFilter, reasonFilter, search]);

  return (
    <div className="adm">
      <Link to="/admin" className="adm__back">
        ← Back to dashboard
      </Link>

      <div className="adm__head">
        <div>
          <p className="adm__eyebrow">Reviews and Comments</p>
          <h1 className="adm__title">Reported reviews &amp; comments.</h1>
        </div>
      </div>

      <div className="adm-tiles">
        <div className="adm-tile adm-tile--accent">
          <p className="adm-tile__label">Reported Reviews</p>
          <p className="adm-tile__value">{counts.reviews}</p>
        </div>
        <div className="adm-tile">
          <p className="adm-tile__label">Reported Comments</p>
          <p className="adm-tile__value">{counts.comments}</p>
        </div>
        <div className="adm-tile">
          <p className="adm-tile__label">Pending</p>
          <p className="adm-tile__value">{counts.pending}</p>
        </div>
        <div className="adm-tile">
          <p className="adm-tile__label">Dismissed</p>
          <p className="adm-tile__value">{counts.dismissed}</p>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="adm-error">
          {errorMessage}
        </p>
      )}

      <div className="adm-panel">
        <div className="adm-toolbar">
          <select
            className="adm-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            aria-label="Filter by type"
          >
            <option value="all">All</option>
            <option value="review">Reviews</option>
            <option value="comment">Comments</option>
          </select>
          <select
            className="adm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
            <option value="Dismissed">Dismissed</option>
          </select>
          <select
            className="adm-select"
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
            aria-label="Filter by reason"
          >
            <option value="all">All Reasons</option>
            <option value="Spam">Spam</option>
            <option value="Harassment">Harassment</option>
            <option value="OffTopic">Off-topic</option>
            <option value="Other">Other</option>
          </select>
          <input
            className="adm-search"
            placeholder="Search reports"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="adm-status">Loading reports…</p>
        ) : visibleReports.length === 0 ? (
          <div className="adm-empty">
            <p className="adm-empty__title">No reports found.</p>
            <p className="adm-empty__hint">Nothing to moderate — or try changing the filters.</p>
          </div>
        ) : (
          <ul className="adm-list">
            {visibleReports.map((report) => (
              <li key={report.id} className="adm-report">
                <p className="adm-report__meta">
                  <span className="adm-badge">{report.reason}</span>
                  <span className="adm-badge adm-badge--muted">{report.reviewId ? 'Review' : 'Comment'}</span>
                  <span
                    className={`adm-badge ${
                      report.status === 'Open'
                        ? 'adm-badge--warn'
                        : report.status === 'Resolved'
                          ? 'adm-badge--ok'
                          : 'adm-badge--muted'
                    }`}
                  >
                    {report.status}
                  </span>
                  {report.reporterDisplayName && <span>reported by {report.reporterDisplayName}</span>}
                </p>
                {report.targetText && <p className="adm-report__text">“{report.targetText}”</p>}

                {report.status === 'Open' && (
                  <div className="adm-report__actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn--danger"
                      onClick={() => resolve(report, 'RemoveContent')}
                      disabled={busyId === report.id}
                    >
                      Remove content
                    </button>
                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() => resolve(report, 'Dismiss')}
                      disabled={busyId === report.id}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
