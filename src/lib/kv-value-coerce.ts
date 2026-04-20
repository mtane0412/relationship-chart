/**
 * KV プロパティエディタの型変換ユーティリティ
 * string / number / boolean の間で値を変換する
 */

/** プロパティ値として扱える型 */
export type KvValueType = 'string' | 'number' | 'boolean';

/** 変換元の型から変換先の型に応じた値の型 */
type KvValue = string | number | boolean;

/**
 * KV プロパティの値を指定した型に変換する
 * @param value 変換元の値
 * @param from 変換元の型
 * @param to 変換先の型
 * @returns 変換後の値
 */
export function coerceKvValue(value: KvValue, from: KvValueType, to: KvValueType): KvValue {
  if (from === to) return value;

  if (to === 'string') return String(value);

  if (to === 'number') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }

  // to === 'boolean'
  if (from === 'number') return (value as number) !== 0;
  // from === 'string'
  return value === 'true';
}
