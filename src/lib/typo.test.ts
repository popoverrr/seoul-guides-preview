import { describe, expect, it } from 'vitest';
import { nb, typo } from './typo';

describe('typo', () => {
  it('binds short words and dashes', () => {
    expect(nb('Гайд в кармане - и на улице')).toBe('Гайд в кармане - и на улице');
  });
  it('groups prices', () => {
    expect(nb('от 1 300 000 ₸')).toBe('от 1 300 000 ₸');
  });
  it('escapes html and keeps emphasis', () => {
    expect(typo('Сеул *<без>*')).toBe('Сеул <em>&lt;без&gt;</em>');
  });
});
