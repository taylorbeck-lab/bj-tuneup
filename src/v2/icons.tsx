/**
 * Desert-modern icon set (original, simple silhouettes): palm, saguaro, agave, sun, starburst.
 * All draw in currentColor so they take the theme.
 */
type P = { size?: number; color?: string; className?: string };

export function Palm({ size = 32, color = 'currentColor', className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill={color} aria-hidden="true">
      <path d="M31 62c1-10 2-22 1-33l3 .4c1 11 0 23-1 32.6z" />
      <path d="M33 28c-4-6-12-9-20-7 6-1 12 1 16 5-6-2-13-1-18 4 6-3 13-3 18-1-4 1-8 4-10 9 4-4 9-7 14-8z" />
      <path d="M33 28c3-7 11-11 19-10-6 0-12 3-15 7 6-3 13-3 18 1-6-2-12-1-17 2 5 0 9 3 11 8-4-3-9-6-14-6z" />
      <path d="M33 28c-1-7 2-14 8-18-4 4-6 9-6 14 1-5 4-9 9-11-4 3-6 8-7 13z" />
    </svg>
  );
}

export function Saguaro({ size = 32, color = 'currentColor', className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill={color} aria-hidden="true">
      <path d="M28 62V12a4 4 0 0 1 8 0v50z" />
      <path d="M28 40h-8a6 6 0 0 1-6-6V22a3 3 0 0 1 6 0v12h8z" />
      <path d="M36 32h7V18a3 3 0 0 1 6 0v14a6 6 0 0 1-6 6h-7z" />
    </svg>
  );
}

export function Agave({ size = 32, color = 'currentColor', className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill={color} aria-hidden="true">
      <path d="M32 58 30 14l2-6 2 6z" />
      <path d="M31 58 16 22l5 3 13 33z" />
      <path d="M33 58l15-36-5 3-13 33z" />
      <path d="M30 58 6 36l6 1 21 21z" />
      <path d="M34 58l24-22-6 1-21 21z" />
    </svg>
  );
}

export function Sun({ size = 32, color = 'currentColor', className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <circle cx="32" cy="32" r="11" fill={color} stroke="none" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return <line key={i} x1={32 + Math.cos(a) * 17} y1={32 + Math.sin(a) * 17} x2={32 + Math.cos(a) * (i % 2 ? 24 : 28)} y2={32 + Math.sin(a) * (i % 2 ? 24 : 28)} />;
      })}
    </svg>
  );
}

/** Mid-century starburst (sparkle) for highlights. */
export function Starburst({ size = 20, color = 'currentColor', className }: P) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" fill={color} aria-hidden="true">
      <path d="M16 0l2.4 13.6L32 16l-13.6 2.4L16 32l-2.4-13.6L0 16l13.6-2.4z" />
    </svg>
  );
}

/** The MESA mark: sun over a flat-topped mesa. */
export function Mark({ size = 26, color = 'currentColor', sun = 'var(--coral)' }: P & { sun?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="13" r="6.5" fill={sun} stroke={color} strokeWidth="2" />
      <path d="M3 26h26M7 26l4.5-6.5h9L25 26" fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** The Casino Tornillo emblem (sun rays over the mesa), from the brand artwork. */
export function Emblem({ height = 22 }: { height?: number }) {
  return <img src={`${import.meta.env.BASE_URL}brand/tornillo-emblem.png`} alt="" height={height} style={{ height, width: 'auto', display: 'block' }} />;
}
