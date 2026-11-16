export interface Card {
  id: number;
  ok: boolean;
  /** The play, e.g. "Double", "Stand", "Bet bigger". */
  title: string;
  /** The hand, e.g. "11 vs 6". */
  hand?: string;
  /** Second line: the reason on a miss, or a next-level hint on a right play. */
  line?: string;
}

/**
 * José's word on your last move, said in his speech bubble like the rest of his lines. Nothing to
 * dismiss: it stays until your next move (bet, hit, stand, double, split, insurance), which brings
 * the next one, so you always have time to read it. Tap it for the full why.
 */
/** The line as José says it after the play: no repeating the play ("Hit. Hit: …"), and "17–21" never split over two lines. */
export function sayLine(title: string, line?: string): string | undefined {
  if (!line) return line;
  const lead = new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^:.]{0,24}:\\s*`, 'i');
  let out = line.replace(lead, '');
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return out.replace(/(\d)–(\d)/g, '$1\u2060–\u2060$2');
}

export function FeedbackCard({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const label = card.hand ?? (card.ok ? 'Good' : 'Not quite');
  const line = sayLine(card.title, card.line);
  return (
    <button type="button" className={'jose-say fb ' + (card.ok ? 'ok' : 'no')} onClick={onOpen} aria-label={`${card.ok ? 'Right' : 'Miss'}: ${card.title}${card.hand ? ', ' + card.hand : ''}. ${card.line ?? ''} Tap for why.`}>
      <small>
        <span className="fb-mark" aria-hidden="true">
          {card.ok ? '✓' : '✗'}
        </span>{' '}
        {label}
        <span className="fb-why">why ›</span>
      </small>
      <span className="fb-say">
        <b className="fb-title">{card.title}.</b> {line}
      </span>
    </button>
  );
}
