import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { reportsApi, type ReportReason } from '../services/reportsApi';

// The four reasons a user can pick, with friendly labels.
const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'Spam', label: 'Spam' },
  { value: 'Harassment', label: 'Harassment' },
  { value: 'OffTopic', label: 'Off-topic' },
  { value: 'Other', label: 'Other' },
];

type ReportDialogProps = {
  // Exactly one of these identifies what is being reported.
  target: { reviewId?: string; commentId?: string };
  onClose: () => void;
};

/**
 * A small inline "report this" panel (User Story 7). Picks a reason and submits. The duplicate-report
 * case (the server's 409) is surfaced right here as an inline message rather than a crash.
 */
export function ReportDialog({ target, onClose }: ReportDialogProps) {
  const { token } = useAuth();
  const [reason, setReason] = useState<ReportReason>('Spam');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit() {
    setStatus('submitting');
    setErrorMessage('');
    try {
      await reportsApi.submit(target, reason, token);
      setStatus('done');
    } catch (error) {
      setStatus('idle');
      // This is where "you have already reported this" (409) shows up.
      setErrorMessage(error instanceof Error ? error.message : 'Could not submit the report.');
    }
  }

  // After a successful report, replace the form with a short confirmation.
  if (status === 'done') {
    return (
      <div className="report-dialog">
        <p>Thanks — a moderator will take a look.</p>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="report-dialog">
      <label className="report-dialog__reason">
        <span>Why are you reporting this?</span>
        <select value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>
          {REASONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {errorMessage && (
        <p role="alert" className="library__error">
          {errorMessage}
        </p>
      )}

      <div className="report-dialog__actions">
        <button
          type="button"
          className="btn btn--cta"
          onClick={handleSubmit}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? 'Sending…' : 'Submit report'}
        </button>
        <button type="button" className="btn" onClick={onClose} disabled={status === 'submitting'}>
          Cancel
        </button>
      </div>
    </div>
  );
}
