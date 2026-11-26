import { describe, it, expect } from 'vitest';
import { installHow, installLine } from '../src/v2/install';
import { mergeV2, levelCoach, DEFAULT_V2 } from '../src/v2/settings';
import { joseLine, noteLevelUp, levelNoteFor, type JoseMoment } from '../src/v2/table/joseLines';
import { gradeBet } from '../src/v2/count/bet';
import { meaning } from '../src/v2/count/CountSheet';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';

describe('add to home screen: the right help for the device', () => {
  it('says nothing once installed', () => {
    expect(installHow(IPHONE, true, false)).toBe('installed');
    expect(installLine('installed')).toBeNull();
  });
  it('iPhone Safari: Share, then Add to Home Screen', () => {
    expect(installHow(IPHONE, false, false)).toBe('ios');
    expect(installLine('ios')).toMatch(/Share.*Add to Home Screen/);
  });
  it('iPhone inside another app or browser: open it in Safari first', () => {
    expect(installHow(IPHONE.replace('Version/18.0', 'CriOS/140.0'), false, false)).toBe('ios-other');
    expect(installHow(IPHONE + ' Instagram 350.0', false, false)).toBe('ios-other');
    expect(installLine('ios-other')).toMatch(/Safari/);
  });
  it('an iPad that calls itself a Mac is still an iPad', () => {
    const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
    expect(installHow(mac, false, false, 5)).toBe('ios');
    expect(installHow(mac, false, false, 0)).toBe('none');
  });
  it('Android: a button when the browser offers one, nothing otherwise', () => {
    expect(installHow(ANDROID, false, true)).toBe('prompt');
    expect(installHow(ANDROID, false, false)).toBe('none');
  });
});

describe('your level decides what you are graded on', () => {
  const coach = (level: 1 | 2 | 3, c = {}) => mergeV2({ onboarded: true, progress: { ...DEFAULT_V2.progress, level }, coach: { ...DEFAULT_V2.coach, ...c } }).coach;
  it('Level 1: no count checks, no bet or count-play grading', () => {
    expect(coach(1, { deviations: true, betCoach: true, countQuiz: 'often' })).toMatchObject({ deviations: false, betCoach: false, countQuiz: 'off' });
  });
  it('Level 2: bets graded, count plays not yet', () => {
    expect(coach(2, { deviations: true, betCoach: false, countQuiz: 'sometimes' })).toMatchObject({ deviations: false, betCoach: true, countQuiz: 'sometimes' });
  });
  it('Level 3: everything graded; how often José checks the count stays your choice', () => {
    expect(coach(3, { deviations: false, betCoach: false, countQuiz: 'off' })).toMatchObject({ deviations: true, betCoach: true, countQuiz: 'off' });
  });
  it('the count is never printed on the table', () => {
    for (const level of [1, 2, 3] as const) expect(levelCoach({ ...DEFAULT_V2.coach, showCount: true }, level).showCount).toBe(false);
  });
});

describe('José at the table', () => {
  const result = (o: Partial<Extract<JoseMoment, { kind: 'result' }>>): JoseMoment => ({ kind: 'result', seed: 1, net: 0, blackjack: false, dealerBlackjack: false, dealerBust: false, bust: false, doubled: false, surrendered: false, streak: 0, ...o });
  it('calls his own hand some of the time, and always the right total', () => {
    let called = 0;
    for (let seed = 0; seed < 60; seed++)
      for (const net of [1, -1, 0])
        for (const total of [17, 18, 19, 20, 21]) {
          const line = joseLine(result({ seed, net, dealerTotal: total }))!;
          const said = line.toLowerCase().match(/seventeen|eighteen|nineteen|twenty-one|twenty/g);
          if (said) {
            called++;
            for (const w of said) expect(w).toBe({ 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty', 21: 'twenty-one' }[total]);
          }
        }
    expect(called).toBeGreaterThan(100);
  });
  it('mostly just waits on your turn', () => {
    const lines = Array.from({ length: 60 }, (_, seed) => joseLine({ kind: 'yourTurn', seed, waiting: false }));
    expect(lines.filter((l) => l === null).length).toBeGreaterThan(30);
    expect(joseLine({ kind: 'yourTurn', seed: 1, waiting: true })).toBeTruthy();
  });
  it('has a word for you once after you move up, then it is gone', () => {
    noteLevelUp('count');
    expect(levelNoteFor(7)).toBe('count');
    expect(levelNoteFor(7)).toBe('count');
    expect(joseLine({ kind: 'levelUp', what: 'count' })).toMatch(/level two/i);
    expect(levelNoteFor(8)).toBeNull();
    expect(levelNoteFor(7)).toBeNull();
  });
});

describe('one way of saying the count', () => {
  it('bets and count checks say "up 3", never "+3"', () => {
    for (const tc of [-3, 0, 1, 2, 3, 5]) for (const bet of [10, 50, 200]) expect(gradeBet(bet, 10, tc).text).not.toMatch(/[+]\d|true count -?\d/i);
    for (const tc of [-3, 0, 1, 2, 4, 6]) expect(meaning(tc)).not.toMatch(/[+]\d/);
    expect(gradeBet(10, 10, 3).text).toMatch(/up 3/);
  });
});
