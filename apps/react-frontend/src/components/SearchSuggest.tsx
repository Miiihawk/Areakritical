import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { gamesApi, type Game } from '../services/gamesApi';

type SearchSuggestProps = {
  placeholder?: string;
  initialValue?: string;
  /** Called on Enter/submit with the raw term. Defaults to navigating to the library. */
  onSubmit?: (term: string) => void;
  /** Called when the user clears the box (the ✕ button). */
  onClear?: () => void;
};

/**
 * A search box with live suggestions: as the user types, it debounces a real search and shows the
 * top matches (cover + title) in a dropdown; picking one jumps straight to that game's page.
 * Submitting (Enter) falls through to the parent's full-results behavior.
 */
export function SearchSuggest({ placeholder, initialValue = '', onSubmit, onClear }: SearchSuggestProps) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [term, setTerm] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Game[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounced live search. Each keystroke restarts the timer; stale responses are ignored.
  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const results = await gamesApi.search(trimmed, token);
        if (active) {
          setSuggestions(results.slice(0, 6));
          setIsOpen(results.length > 0);
        }
      } catch {
        if (active) setSuggestions([]);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, token]);

  // Close the dropdown when clicking anywhere outside the component.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsOpen(false);
    const trimmed = term.trim();
    if (onSubmit) {
      onSubmit(trimmed);
    } else {
      navigate(trimmed ? `/library?q=${encodeURIComponent(trimmed)}` : '/library');
    }
  }

  function handleClear() {
    setTerm('');
    setSuggestions([]);
    setIsOpen(false);
    onClear?.();
  }

  function handlePick(game: Game) {
    setIsOpen(false);
    navigate(`/games/${game.id}`);
  }

  return (
    <div className="suggest" ref={rootRef}>
      <form className="suggest__form" onSubmit={handleSubmit}>
        <span className="suggest__icon" aria-hidden="true">⌕</span>
        <input
          type="text"
          aria-label="Search the archive"
          placeholder={placeholder ?? 'Search titles in the archive...'}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        />
        {term && (
          <button type="button" className="suggest__clear" aria-label="Clear search" onClick={handleClear}>
            ✕
          </button>
        )}
      </form>

      {isOpen && (
        <ul className="suggest__list" role="listbox">
          {suggestions.map((game) => (
            <li key={game.id}>
              <button type="button" className="suggest__item" onClick={() => handlePick(game)}>
                {game.coverImageUrl ? (
                  <img src={game.coverImageUrl} alt="" loading="lazy" />
                ) : (
                  <span className="suggest__thumb-empty" aria-hidden="true" />
                )}
                <span className="suggest__title">{game.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
