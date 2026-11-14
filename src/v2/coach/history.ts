/** Recent coach events (this session), used as context for "Ask the coach". */
export interface CoachEvent {
  t: number;
  text: string;
}
const events: CoachEvent[] = [];
export function pushEvent(text: string) {
  events.push({ t: Date.now(), text });
  if (events.length > 30) events.shift();
}
export function recentEvents(n = 12): CoachEvent[] {
  return events.slice(-n);
}
