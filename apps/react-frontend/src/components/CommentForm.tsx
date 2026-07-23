import { useState, type FormEvent } from 'react';

type CommentFormProps = {
  // The parent decides what happens with the text (create a new comment, or save an edit).
  onSubmit: (text: string) => Promise<void>;
  initialText?: string;
  submitLabel?: string;
  onCancel?: () => void;
};

/**
 * A one-line comment editor (User Story 4/5). Rejects empty text inline before ever calling the
 * server, and clears itself after a successful create.
 */
export function CommentForm({
  onSubmit,
  initialText = '',
  submitLabel = 'Post',
  onCancel,
}: CommentFormProps) {
  const [text, setText] = useState(initialText);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');

    if (!text.trim()) {
      setErrorMessage('Comment cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(text);
      // Only clear when creating (no initial text); an edit keeps its content until the parent closes it.
      if (!initialText) {
        setText('');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not post the comment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Add a comment..."
        aria-label="Comment text"
      />
      <button type="submit" className="btn btn--cta comment-form__post" disabled={isSubmitting}>
        <span aria-hidden="true">➤</span> {isSubmitting ? 'Posting…' : submitLabel}
      </button>
      {onCancel && (
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      )}
      {errorMessage && (
        <p role="alert" className="library__error">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
