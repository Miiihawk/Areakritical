import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { adminApi, type AdminReport } from '../../services/adminApi';

/**
 * Admin report queue (User Story 8). Lists open reports and lets the Admin either remove the reported
 * content or dismiss the report. Removing content marks the report Resolved first, then deletes the
 * target (the report survives, thanks to the SetNull delete rule) — but from here it's just one click.
 */
export function AdminReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      // Default view is the open queue.
      setReports(await adminApi.listReports('Open', token));
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
    await adminApi.resolveReport(report.id, action, token);
    await loadReports();
  }

  if (isLoading) {
    return <section className="panel"><p>Loading reports…</p></section>;
  }

  return (
    <section className="panel">
      <h1>Reports</h1>
      {errorMessage && <p role="alert" className="library__error">{errorMessage}</p>}

      {reports.length === 0 ? (
        <p>No open reports. 🎉</p>
      ) : (
        <ul className="report-queue">
          {reports.map((report) => (
            <li key={report.id} className="report-queue__item">
              <p className="report-queue__meta">
                <strong>{report.reason}</strong>
                {' · '}
                {report.reviewId ? 'Review' : 'Comment'}
                {report.reporterDisplayName ? ` · reported by ${report.reporterDisplayName}` : ''}
              </p>
              {report.targetText && <p className="report-queue__text">“{report.targetText}”</p>}

              <div className="report-queue__actions">
                <button type="button" className="btn" onClick={() => resolve(report, 'RemoveContent')}>
                  Remove content
                </button>
                <button type="button" className="btn" onClick={() => resolve(report, 'Dismiss')}>
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
