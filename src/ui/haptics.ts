let enabled = true;
export function setHaptics(on: boolean) {
  enabled = on;
}
/** Short vibration on errors where supported (Android Chrome). */
export function buzzError() {
  if (enabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40, 30, 40]);
    } catch {
      /* ignore */
    }
  }
}
export function buzzTap() {
  if (enabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      /* ignore */
    }
  }
}
