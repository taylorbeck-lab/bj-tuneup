import { describe, it, expect } from 'vitest';
import { countWords, padPress, padValue, padText, EMPTY_PAD, type PadState } from '../src/v2/count/words';

const press = (...keys: string[]) => keys.reduce<PadState>((s, k) => padPress(s, k), EMPTY_PAD);

describe('count keypad (up / down / even)', () => {
  it('reads counts the way counters say them', () => {
    expect(countWords(3)).toBe('up 3');
    expect(countWords(-2)).toBe('down 2');
    expect(countWords(0)).toBe('even');
  });
  it('direction first, then the number', () => {
    expect(padValue(press('up', '3'))).toBe(3);
    expect(padValue(press('down', '4'))).toBe(-4);
    expect(padText(press('down', '4'))).toBe('DOWN 4');
  });
  it('number first, then the direction', () => {
    expect(padValue(press('5'))).toBeNull();
    expect(padText(press('5'))).toBe('5: up or down?');
    expect(padValue(press('5', 'up'))).toBe(5);
  });
  it('two-digit counts and switching direction', () => {
    expect(padValue(press('up', '1', '2'))).toBe(12);
    expect(padValue(press('up', '1', '2', '3'))).toBe(12);
    expect(padValue(press('up', '7', 'down'))).toBe(-7);
  });
  it('even and zero', () => {
    expect(padValue(press('even'))).toBe(0);
    expect(padValue(press('0'))).toBe(0);
    expect(padValue(press('even', '3'))).toBeNull();
    expect(padValue(press('even', '3', 'down'))).toBe(-3);
  });
  it('delete clears the last digit, then the direction', () => {
    expect(padValue(press('up', '1', '2', 'del'))).toBe(1);
    expect(press('up', 'del')).toEqual(EMPTY_PAD);
  });
  it('nothing entered is incomplete', () => {
    expect(padValue(EMPTY_PAD)).toBeNull();
    expect(padValue(press('up'))).toBeNull();
  });
});
