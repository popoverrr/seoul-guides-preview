import { describe, expect, it } from 'vitest';
import { md, naverHref } from './md';

describe('md', () => {
  it('escapes HTML — the guides never carry markup', () => {
    expect(md('<img src=x onerror=alert(1)>')).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });
  it('bold, italic, paragraphs, line breaks', () => {
    expect(md('**Важно** и *курсив*\nвторая строка\n\nабзац')).toBe('<p><strong>Важно</strong> и <em>курсив</em><br>вторая строка</p><p>абзац</p>');
  });
  it('lists', () => {
    expect(md('- один\n- два\n1. раз')).toBe('<ul><li>один</li><li>два</li></ul><ol><li>раз</li></ol>');
  });
  it('keeps safe links, drops javascript:', () => {
    expect(md('[сайт](https://example.com)')).toBe('<p><a href="https://example.com" target="_blank" rel="noopener nofollow">сайт</a></p>');
    expect(md('[x](javascript:alert)')).toBe('<p>x</p>');
    expect(md('[в кабинет](/account/)')).toBe('<p><a href="/account/">в кабинет</a></p>');
  });
});

describe('naverHref', () => {
  it('passes the client links through untouched', () => {
    expect(naverHref('https://naver.me/TEST0001')).toBe('https://naver.me/TEST0001');
    expect(naverHref('https://map.naver.com/p/entry/place/123')).toBe('https://map.naver.com/p/entry/place/123');
  });
  it('refuses anything else', () => {
    expect(naverHref('https://maps.google.com/x')).toBeNull();
    expect(naverHref('javascript:alert(1)')).toBeNull();
    expect(naverHref('http://naver.me/x')).toBeNull();
    expect(naverHref(null)).toBeNull();
  });
});
