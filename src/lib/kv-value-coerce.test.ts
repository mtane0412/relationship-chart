/**
 * kv-value-coerce.ts のユニットテスト
 * KV プロパティエディタの型変換ロジックを検証する
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { coerceKvValue, type KvValueType } from './kv-value-coerce';

describe('coerceKvValue', () => {
  describe('string → number', () => {
    it('数値文字列を数値に変換する', () => {
      expect(coerceKvValue('42', 'string', 'number')).toBe(42);
    });

    it('小数点を含む文字列を数値に変換する', () => {
      expect(coerceKvValue('3.14', 'string', 'number')).toBe(3.14);
    });

    it('数値でない文字列は 0 にフォールバックする', () => {
      expect(coerceKvValue('abc', 'string', 'number')).toBe(0);
    });

    it('空文字列は 0 にフォールバックする', () => {
      expect(coerceKvValue('', 'string', 'number')).toBe(0);
    });
  });

  describe('string → boolean', () => {
    it('"true" は true に変換する', () => {
      expect(coerceKvValue('true', 'string', 'boolean')).toBe(true);
    });

    it('"false" は false に変換する', () => {
      expect(coerceKvValue('false', 'string', 'boolean')).toBe(false);
    });

    it('"true" 以外の文字列は false に変換する', () => {
      expect(coerceKvValue('yes', 'string', 'boolean')).toBe(false);
    });
  });

  describe('number → string', () => {
    it('数値を文字列に変換する', () => {
      expect(coerceKvValue(42, 'number', 'string')).toBe('42');
    });

    it('小数点を含む数値を文字列に変換する', () => {
      expect(coerceKvValue(3.14, 'number', 'string')).toBe('3.14');
    });
  });

  describe('number → boolean', () => {
    it('非ゼロ数値は true に変換する', () => {
      expect(coerceKvValue(1, 'number', 'boolean')).toBe(true);
    });

    it('0 は false に変換する', () => {
      expect(coerceKvValue(0, 'number', 'boolean')).toBe(false);
    });

    it('負の数値は true に変換する', () => {
      expect(coerceKvValue(-1, 'number', 'boolean')).toBe(true);
    });
  });

  describe('boolean → string', () => {
    it('true は "true" に変換する', () => {
      expect(coerceKvValue(true, 'boolean', 'string')).toBe('true');
    });

    it('false は "false" に変換する', () => {
      expect(coerceKvValue(false, 'boolean', 'string')).toBe('false');
    });
  });

  describe('boolean → number', () => {
    it('true は 1 に変換する', () => {
      expect(coerceKvValue(true, 'boolean', 'number')).toBe(1);
    });

    it('false は 0 に変換する', () => {
      expect(coerceKvValue(false, 'boolean', 'number')).toBe(0);
    });
  });

  describe('同じ型への変換（同一型）', () => {
    it('string → string はそのまま返す', () => {
      expect(coerceKvValue('hello', 'string', 'string')).toBe('hello');
    });

    it('number → number はそのまま返す', () => {
      expect(coerceKvValue(42, 'number', 'number')).toBe(42);
    });

    it('boolean → boolean はそのまま返す', () => {
      expect(coerceKvValue(true, 'boolean', 'boolean')).toBe(true);
    });
  });
});

describe('KvValueType', () => {
  it('string/number/boolean の3種類が型レベルで定義されている', () => {
    // 型レベルで完全一致を検証する（新たなリテラル型追加時に検出できる）
    expectTypeOf<KvValueType>().toEqualTypeOf<'string' | 'number' | 'boolean'>();
  });
});
