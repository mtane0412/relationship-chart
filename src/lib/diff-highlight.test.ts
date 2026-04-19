/**
 * diff-highlight モジュールのテスト
 *
 * getDiffEdgeStyle / getDiffMarkerKey の各diffStatusに対する返却値を検証する
 */

import { describe, it, expect } from 'vitest';
import { getDiffEdgeStyle, getDiffMarkerKey, DIFF_HIGHLIGHT_COLORS } from './diff-highlight';

describe('DIFF_HIGHLIGHT_COLORS', () => {
  it('added は緑色である', () => {
    expect(DIFF_HIGHLIGHT_COLORS.added).toBe('#22c55e');
  });

  it('removed は赤色である', () => {
    expect(DIFF_HIGHLIGHT_COLORS.removed).toBe('#ef4444');
  });

  it('changed は青色である', () => {
    expect(DIFF_HIGHLIGHT_COLORS.changed).toBe('#3b82f6');
  });
});

describe('getDiffEdgeStyle', () => {
  it('diffStatus が "added" のとき緑色とハイライト線幅を返す', () => {
    const style = getDiffEdgeStyle('added');
    expect(style).not.toBeNull();
    expect(style?.stroke).toBe('#22c55e');
    expect(style?.strokeWidth).toBeGreaterThan(1);
  });

  it('diffStatus が "removed" のとき赤色とハイライト線幅を返す', () => {
    const style = getDiffEdgeStyle('removed');
    expect(style).not.toBeNull();
    expect(style?.stroke).toBe('#ef4444');
    expect(style?.strokeWidth).toBeGreaterThan(1);
  });

  it('diffStatus が "changed" のとき青色とハイライト線幅を返す', () => {
    const style = getDiffEdgeStyle('changed');
    expect(style).not.toBeNull();
    expect(style?.stroke).toBe('#3b82f6');
    expect(style?.strokeWidth).toBeGreaterThan(1);
  });

  it('diffStatus が null のとき null を返す', () => {
    expect(getDiffEdgeStyle(null)).toBeNull();
  });

  it('diffStatus が undefined のとき null を返す', () => {
    expect(getDiffEdgeStyle(undefined)).toBeNull();
  });
});

describe('getDiffMarkerKey', () => {
  it('diffStatus が "added" のとき "green" を返す', () => {
    expect(getDiffMarkerKey('added')).toBe('green');
  });

  it('diffStatus が "removed" のとき "red" を返す', () => {
    expect(getDiffMarkerKey('removed')).toBe('red');
  });

  it('diffStatus が "changed" のとき "blue" を返す', () => {
    expect(getDiffMarkerKey('changed')).toBe('blue');
  });

  it('diffStatus が null のとき null を返す', () => {
    expect(getDiffMarkerKey(null)).toBeNull();
  });

  it('diffStatus が undefined のとき null を返す', () => {
    expect(getDiffMarkerKey(undefined)).toBeNull();
  });
});
