import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { rankOf, RANK_LABELS, suitOf, SUIT_GLYPHS, isRed, cardName, type CardId } from '../engine/cards';
import { back } from '../router';

export function TopBar({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-btn" aria-label="Back" onClick={onBack ?? back}>
        ←
      </button>
      <h1>{title}</h1>
      <div className="row" style={{ justifyContent: 'center' }}>
        {right}
      </div>
    </header>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'default';
  block?: boolean;
  big?: boolean;
  selected?: boolean;
};
export function Button({ variant = 'default', block, big, selected, className, ...rest }: BtnProps) {
  const cls = ['btn', variant !== 'default' && variant, block && 'block', big && 'big', selected && 'selected', className]
    .filter(Boolean)
    .join(' ');
  return <button type="button" className={cls} {...rest} />;
}

export function Box({ title, right, children, className }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={'box ' + (className ?? '')}>
      {(title || right) && (
        <div className="box-head">
          <span className="label">{title}</span>
          {right}
        </div>
      )}
      <div className="box-body">{children}</div>
    </section>
  );
}

export function Instrument({ label, value, unit, tone, big }: { label: string; value: ReactNode; unit?: string; tone?: 'bad' | 'pos'; big?: boolean }) {
  return (
    <div className="instr">
      <span className="label">{label}</span>
      <span className={'v ' + (big ? 'big ' : '') + (tone === 'bad' ? 'accent' : tone === 'pos' ? 'pos' : '')}>{value}</span>
      {unit && <span className="u">{unit}</span>}
    </div>
  );
}

export function Instruments({ children }: { children: ReactNode }) {
  return <div className="instruments">{children}</div>;
}

export function Seg<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} className="switch" onClick={() => onChange(!checked)} />;
}

export function Field({ name, hint, children }: { name: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <div>
        <div className="name">{name}</div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function CardTile({ card, size, faceDown, dim, className }: { card?: CardId; size?: 'sm' | 'lg' | 'xl'; faceDown?: boolean; dim?: boolean; className?: string }) {
  if (faceDown || card === undefined) {
    return <div className={['card', 'back', size, className].filter(Boolean).join(' ')} aria-label="face-down card" />;
  }
  const cls = ['card', size, isRed(card) && 'red', `s-${suitOf(card)}`, dim && 'dim', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="img" aria-label={cardName(card)}>
      <span className="rank">{RANK_LABELS[rankOf(card)]}</span>
      <span className="suit">{SUIT_GLYPHS[suitOf(card)]}</span>
    </div>
  );
}

export function Hand({ cards, size, spread, holeDown }: { cards: CardId[]; size?: 'sm' | 'lg' | 'xl'; spread?: boolean; holeDown?: boolean }) {
  return (
    <div className={'hand' + (spread ? ' spread' : '')}>
      {cards.map((c, i) => (
        <CardTile key={i} card={c} size={size} faceDown={holeDown && i === 1} />
      ))}
    </div>
  );
}

export function fmtSigned(x: number, digits = 2): string {
  if (!isFinite(x)) return '—';
  const s = x.toFixed(digits);
  return x > 0 ? '+' + s : x === 0 ? s : s.replace('-', '−');
}
export function fmtPct(x: number, digits = 2): string {
  return fmtSigned(x * 100, digits) + '%';
}
export function fmtNum(x: number, digits = 0): string {
  return isFinite(x) ? x.toFixed(digits) : '—';
}
