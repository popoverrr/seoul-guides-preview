import { describe, expect, it } from 'vitest';
import { message, plural } from './pick';

describe('pick', () => {
  it('pluralises guides in Russian', () => {
    expect(plural(1)).toBe('1 гайд');
    expect(plural(2)).toBe('2 гайда');
    expect(plural(5)).toBe('5 гайдов');
    expect(plural(11)).toBe('11 гайдов');
    expect(plural(22)).toBe('22 гайда');
  });
  it('builds one WhatsApp message for the selection', () => {
    expect(message(['Seoul Food'])).toBe('Здравствуйте! Хочу купить гайд «Seoul Food» (RU)');
    expect(message(['Seoul Food', 'Бьюти'])).toBe('Здравствуйте! Хочу купить гайды: Seoul Food, Бьюти (RU)');
    expect(message(['Seoul Food', 'Бьюти'], true)).toBe('Здравствуйте! Хочу купить все гайды комплектом со скидкой: Seoul Food, Бьюти (RU)');
  });
});
