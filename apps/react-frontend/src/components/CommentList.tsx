import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { getUserIdFromToken } from '../auth/currentUserId';
import { commentsApi, type Comment } from '../services/commentsApi';
import { CommentForm } from './CommentForm';
import { ReportDialog } from './ReportDialog';
import { initialsOf, shortDate } from './ReviewList';

type CommentListProps = {
  reviewId: string;
};

/**
 * The comment thread under a single review (User Stories 4 & 5). It is SELF-CONTAINED: it fetches
 * its own comments and handles adding/editing/deleting/reporting them, refreshing after each
 * change. A "Hide/Show comments (n)" toggle collapses the thread; the add-comment bar stays at
 * the bottom, mirroring the reference design.
 */
export function CommentList({ reviewId }: CommentListProps) {
  const { token } = useAuth();
  const currentUserId = getUserIdFromToken(token);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // useCallback so this function is stable and can be a dependency of the effect below.
  const loadComments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await commentsApi.list(reviewId, token);
      setComments(result.comments);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load comments.');
    } finally {
      setIsLoading(false);
    }
  }, [reviewId, token]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function handleCreate(text: string) {
    await commentsApi.create(reviewId, text, token);
    await loadComments();
  }

  async function handleUpdate(commentId: string, text: string) {
    await commentsApi.update(commentId, text, token);
    setEditingId(null);
    await loadComments();
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm('Delete this comment?')) {
      return;
    }
    await commentsApi.remove(commentId, token);
    await loadComments();
  }

  return (
    <div className="thread">
      {isLoading && <p className="thread__status">Loading comments…</p>}

      {errorMessage && (
        <p role="alert" className="library__error">
          {errorMessage}
        </p>
      )}

      {!isLoading && !errorMessage && comments.length > 0 && (
        <button
          type="button"
          className="thread__toggle"
          onClick={() => setIsExpanded((open) => !open)}
        >
          {isExpanded ? 'Hide' : 'Show'} comments ({comments.length})
        </button>
      )}

      {isExpanded && (
        <ul className="thread__items">
          {comments.map((comment) => {
            const isMine = comment.authorId === currentUserId;

            // Edit mode: swap the comment's text for an inline editor.
            if (editingId === comment.id) {
              return (
                <li key={comment.id} className="thread-item">
                  <CommentForm
                    initialText={comment.text}
                    submitLabel="Save"
                    onSubmit={(text) => handleUpdate(comment.id, text)}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              );
            }

            return (
              <li key={comment.id} className="thread-item">
                <span className="avatar avatar--sm" aria-hidden="true">
                  {initialsOf(comment.authorDisplayName)}
                </span>

                <div className="thread-item__body">
                  <p className="thread-item__meta">
                    <strong>{comment.authorDisplayName}</strong>
                    <span>{shortDate(comment.createdAt)}</span>
                  </p>
                  <p className="thread-item__text">{comment.text}</p>
                </div>

                <div className="thread-item__actions">
                  {isMine ? (
                    <>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Edit comment"
                        title="Edit"
                        onClick={() => setEditingId(comment.id)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        aria-label="Delete comment"
                        title="Delete"
                        onClick={() => handleDelete(comment.id)}
                      >
                        🗑
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Report comment"
                      title="Report"
                      onClick={() => setReportingId(comment.id)}
                    >
                      ⚑
                    </button>
                  )}
                </div>

                {reportingId === comment.id && (
                  <ReportDialog
                    target={{ commentId: comment.id }}
                    onClose={() => setReportingId(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Adding a new comment is always available at the bottom of the thread. */}
      <CommentForm onSubmit={handleCreate} />
    </div>
  );
}
