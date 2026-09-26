import { describe, expect, it } from 'vitest';
import { cleanChat } from './chat.js';

describe('cleanChat', () => {
  it('trims, collapses whitespace, strips control chars and caps length', () => {
    expect(cleanChat('  hi\u0007   there ')).toBe('hi there');
    expect(cleanChat('a'.repeat(300))).toHaveLength(140);
  });
  it('masks blocked words', () => {
    expect(cleanChat('you kys')).toBe('you ***');
  });
});
