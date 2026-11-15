/**
 * "Ask the coach": a chat with Claude about your play. Gated by the user's own API key, which stays
 * on this device (IndexedDB) and is sent only to the Anthropic API.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { V2Settings } from '../settings';
import type { V2Stats } from '../stats';
import { leaks } from '../practice';
import { rulesLabel } from '../../engine/rules';
import { recentEvents } from './history';

export const COACH_MODEL = 'claude-opus-5-5';

const SYSTEM = `You are the coach inside Casino Tornillo, a blackjack practice app. The player is learning in three modes: basic strategy; then counting cards with Hi-Lo (running and true count) and raising bets when the count is good; then count plays (deviations).

How to coach:
- Talk like a friendly, sharp table regular who teaches well. Plain words. No jargon unless you explain it in the same sentence.
- Keep answers short: 2-6 sentences, or a few bullets. Offer to go deeper rather than writing an essay.
- Explain the why with odds and simple logic ("a 6 busts 42% of the time", "only a 10 busts a 12"), the way the app does.
- When the context lists the player's leaks or recent mistakes, use them: name the hand, give the rule, give a memory hook.
- Counting: Hi-Lo tags 2-6 +1, 7-9 0, 10-A -1. True count = running count / decks left, rounded down. Each +1 of true count is worth about +0.5% to the player.
- If asked to quiz, ask one question at a time and wait for the answer.
- This is practice with play money. Do not encourage problem gambling or chasing losses. If asked about using a phone or device to count at a casino, say plainly that it is illegal in Nevada and many other places, and that this app is for practice only.
- Stick to blackjack, card counting, bankroll and the app. Politely steer back if asked about something else.`;

export function contextNote(s: V2Settings, stats: V2Stats | null): string {
  const lines: string[] = [];
  lines.push(`Game: ${rulesLabel(s.rules)}, ${s.players} players, table minimum $${s.tableMin}.`);
  lines.push(
    `Learning settings: coach ${s.coach.feedback}, count plays ${s.coach.deviations ? 'on' : 'off'}, count helper ${s.coach.showCount ? 'on' : 'off'}, quizzes ${s.coach.countQuiz}, bet coach ${s.coach.betCoach ? 'on' : 'off'}.`,
  );
  if (stats) {
    const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) + '%' : 'n/a');
    lines.push(`Record: ${pct(stats.right, stats.decisions)} right calls over ${stats.decisions} decisions; count checks ${pct(stats.count.rcRight, stats.count.n)} exact (${stats.count.n} checks); count plays ${pct(stats.deviations.right, stats.deviations.n)}; bets ${pct(stats.bets.right, stats.bets.n)}.`);
    const l = leaks(stats)
      .sort((a, b) => b.recentMisses - a.recentMisses)
      .slice(0, 8)
      .map((x) => `${x.label} (${x.right}/${x.n} right)`);
    if (l.length) lines.push(`Current leaks: ${l.join('; ')}.`);
  }
  const ev = recentEvents();
  if (ev.length) lines.push('Recent coach feedback (oldest first):\n' + ev.map((e) => '- ' + e.text).join('\n'));
  return lines.join('\n');
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export class CoachError extends Error {}

/** Stream a reply. `onText` receives text as it arrives. */
export async function askCoach(apiKey: string, history: ChatTurn[], context: string, onText: (t: string) => void, signal?: AbortSignal): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((h) => ({ role: h.role, content: h.text }));
  // Live context goes in a mid-conversation system message after the newest user turn,
  // so the stable system prompt and earlier turns stay cacheable.
  messages.push({ role: 'system', content: `Context for this reply (from the app):\n${context}` });
  try {
    const stream = client.beta.messages.stream(
      {
        model: COACH_MODEL,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages,
      },
      { signal },
    );
    let text = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        onText(text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new CoachError("The coach can't help with that one. Try asking about a hand, the count, or your bets.");
    return text;
  } catch (e) {
    if (e instanceof CoachError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new CoachError('That API key was rejected. Check it in Settings.');
    if (e instanceof Anthropic.RateLimitError) throw new CoachError('The coach is busy (rate limited). Try again in a minute.');
    if (e instanceof Anthropic.APIConnectionError) throw new CoachError("Can't reach the coach. Check your connection.");
    if (e instanceof Anthropic.APIError) throw new CoachError(`Coach error (${e.status}). Try again.`);
    throw e;
  }
}
