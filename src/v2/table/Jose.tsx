/**
 * José, the dealer, behind the table: a portrait when there's room, a round face and a speech
 * bubble when space is tight. What he says lives in joseLines.ts.
 */
import type { ReactNode } from 'react';

/**
 * José behind the table. Everything at the table comes from him: his own line, or (passed in as
 * `says`) the feedback on your play and bet, or the count when you ask him for it.
 */
export function JoseZone({ line, says }: { line: string | null; says?: ReactNode }) {
  const base = import.meta.env.BASE_URL;
  const bubble = says ?? (line ? (
    <div className="jose-say" key={line}>
      <small>José</small>
      {line}
    </div>
  ) : null);
  return (
    <div className="jose-zone">
      <img className="jose-portrait" src={`${base}brand/jose-portrait.jpg`} alt="José, your dealer" />
      <img className="jose-face" src={`${base}brand/jose-avatar.jpg`} alt="" />
      <div className="jose-slot" aria-live="polite">
        {bubble}
      </div>
    </div>
  );
}
