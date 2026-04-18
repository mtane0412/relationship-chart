/**
 * mention-utils のテスト
 *
 * @メンション機能に関するユーティリティ関数のテスト。
 * extractMentionQuery, parseMentions, filterPersonsByQuery をカバーする。
 */

import { describe, it, expect } from 'vitest';
import {
  extractMentionQuery,
  parseMentions,
  filterPersonsByQuery,
  findCommonPrefix,
  findMentionRanges,
  findRawEndPosition,
} from './mention-utils';
import type { Person } from '@/types/person';

// テスト用の人物データ
const テスト人物リスト: Person[] = [
  { id: 'id-alice', name: '田中花子', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'id-bob', name: '山田太郎', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'id-carol', name: '鈴木一郎', createdAt: '2024-01-01T00:00:00.000Z' },
  { id: 'id-dave', name: 'Alice Smith', createdAt: '2024-01-01T00:00:00.000Z' },
];

describe('extractMentionQuery', () => {
  it('カーソル位置の直前に @ がある場合はクエリを返す', () => {
    const text = '田中と@山田が';
    // カーソルを「@山田」の直後（インデックス6）に配置
    const result = extractMentionQuery(text, 6);
    expect(result).toEqual({ query: '山田', startIndex: 3 });
  });

  it('@ の直後にカーソルがある場合（クエリが空）は空文字列を返す', () => {
    const text = '田中と@';
    const result = extractMentionQuery(text, 4);
    expect(result).toEqual({ query: '', startIndex: 3 });
  });

  it('@の前にスペースがあり、カーソルが@の後にある場合は検出する', () => {
    const text = 'こんにちは @田中';
    const result = extractMentionQuery(text, 9);
    expect(result).toEqual({ query: '田中', startIndex: 6 });
  });

  it('@より前にカーソルがある場合は null を返す', () => {
    const text = '@田中';
    const result = extractMentionQuery(text, 0);
    expect(result).toBeNull();
  });

  it('@の後にスペースがある場合はメンションが終了しているとみなして null を返す', () => {
    // 「@田中 」のスペースの後ろにカーソルがある場合
    const text = '@田中 次の文章';
    const result = extractMentionQuery(text, 5);
    expect(result).toBeNull();
  });

  it('@が存在しない場合は null を返す', () => {
    const text = '普通のテキスト';
    const result = extractMentionQuery(text, 7);
    expect(result).toBeNull();
  });

  it('文頭の @ を検出できる', () => {
    const text = '@田中花子';
    const result = extractMentionQuery(text, 5);
    expect(result).toEqual({ query: '田中花子', startIndex: 0 });
  });

  it('複数の @ がある場合は直近の @ を使用する', () => {
    const text = '@山田 と @田中';
    // カーソルを「@田中」の末尾に配置
    // '@山田 と @田中' のインデックス: 0=@ 1=山 2=田 3=空 4=と 5=空 6=@ 7=田 8=中
    const result = extractMentionQuery(text, 9);
    expect(result).toEqual({ query: '田中', startIndex: 6 });
  });

  it('改行の後の @ を検出できる', () => {
    const text = '一行目\n@田中';
    const result = extractMentionQuery(text, 7);
    expect(result).toEqual({ query: '田中', startIndex: 4 });
  });

  it('テキストが空の場合は null を返す', () => {
    const result = extractMentionQuery('', 0);
    expect(result).toBeNull();
  });
});

describe('filterPersonsByQuery', () => {
  it('クエリに一致する人物を返す（部分一致）', () => {
    const result = filterPersonsByQuery('田中', テスト人物リスト);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('田中花子');
  });

  it('大文字小文字を区別せずに一致する', () => {
    const result = filterPersonsByQuery('alice', テスト人物リスト);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice Smith');
  });

  it('クエリが空の場合はすべての人物を返す', () => {
    const result = filterPersonsByQuery('', テスト人物リスト);
    expect(result).toHaveLength(テスト人物リスト.length);
  });

  it('一致しない場合は空配列を返す', () => {
    const result = filterPersonsByQuery('存在しない名前', テスト人物リスト);
    expect(result).toHaveLength(0);
  });

  it('人物リストが空の場合は空配列を返す', () => {
    const result = filterPersonsByQuery('田中', []);
    expect(result).toHaveLength(0);
  });

  it('全角スペースを含むクエリでも一致する', () => {
    const 全角スペース人物: Person[] = [
      { id: 'id-1', name: '山田　太郎', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const result = filterPersonsByQuery('山田', 全角スペース人物);
    expect(result).toHaveLength(1);
  });
});

describe('findCommonPrefix', () => {
  it('共通プレフィックスを返す', () => {
    expect(findCommonPrefix(['田中花子', '田中一郎', '田中太郎'])).toBe('田中');
  });

  it('1件のみの場合はその文字列をそのまま返す', () => {
    expect(findCommonPrefix(['山田太郎'])).toBe('山田太郎');
  });

  it('共通プレフィックスがない場合は空文字列を返す', () => {
    expect(findCommonPrefix(['田中', '山田', '鈴木'])).toBe('');
  });

  it('配列が空の場合は空文字列を返す', () => {
    expect(findCommonPrefix([])).toBe('');
  });

  it('完全一致の場合はその文字列を返す', () => {
    expect(findCommonPrefix(['田中', '田中'])).toBe('田中');
  });

  it('元のケースを保持して共通プレフィックスを返す', () => {
    // 'Alice' と 'Alicia' → 'Alic' が共通
    expect(findCommonPrefix(['Alice', 'Alicia'])).toBe('Alic');
  });
});

describe('findRawEndPosition', () => {
  it('空白なし: 正規化後の長さ=元の長さ', () => {
    // 「山田太郎」は正規化しても長さが変わらないので rawEndPos = 4
    expect(findRawEndPosition('山田太郎', 4)).toBe(4);
  });

  it('半角スペース1つ: 正規化後の長さ=元の長さ', () => {
    // 「山田 太郎」は正規化後も「山田 太郎」(5文字) → rawEndPos = 5
    expect(findRawEndPosition('山田 太郎', 5)).toBe(5);
  });

  it('連続した半角スペース: 正規化後は1文字分だが元は2文字分', () => {
    // 「山田  太郎」(スペース2つ, 6文字) の正規化後は「山田 太郎」(5文字) → rawEndPos = 6
    expect(findRawEndPosition('山田  太郎', 5)).toBe(6);
  });

  it('全角スペース: 正規化後は半角スペース1つに', () => {
    // 「山田\u3000太郎」(全角スペース, 5文字) の正規化後は「山田 太郎」(5文字) → rawEndPos = 5
    expect(findRawEndPosition('山田\u3000太郎', 5)).toBe(5);
  });

  it('半角英字のスペース1つ: rawEndPos = 11', () => {
    // 「alice smith」は正規化後も「alice smith」(11文字) → rawEndPos = 11
    expect(findRawEndPosition('alice smith', 11)).toBe(11);
  });

  it('半角英字の連続スペース: 正規化後は1つ分だが元は2文字分', () => {
    // 「alice  smith」(スペース2つ, 12文字) の正規化後は「alice smith」(11文字) → rawEndPos = 12
    expect(findRawEndPosition('alice  smith', 11)).toBe(12);
  });

  it('先頭に半角スペースがある場合: trim相当でスキップ', () => {
    // 「 山田太郎」(先頭スペース付き, 5文字) の正規化後は「山田太郎」(4文字) → rawEndPos = 5
    expect(findRawEndPosition(' 山田太郎', 4)).toBe(5);
  });

  it('正規化後の長さが足りない場合は null を返す', () => {
    // 「山田」(2文字) に対して normalizedTargetLength=5 は不足
    expect(findRawEndPosition('山田', 5)).toBeNull();
  });
});

describe('findMentionRanges', () => {
  it('有効なメンションの開始・終了インデックスを返す', () => {
    // '@田中花子 と @山田太郎'
    // 0:@ 1:田 2:中 3:花 4:子 5:空 6:と 7:空 8:@ 9:山 10:田 11:太 12:郎
    const text = '@田中花子 と @山田太郎';
    const ranges = findMentionRanges(text, テスト人物リスト);
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toEqual({ start: 0, end: 5 }); // '@田中花子'
    expect(ranges[1]).toEqual({ start: 8, end: 13 }); // '@山田太郎'
  });

  it('存在しない名前はスキップする', () => {
    const text = '@存在しない と @田中花子';
    const ranges = findMentionRanges(text, テスト人物リスト);
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('@田中花子');
  });

  it('人物が存在しない場合は空配列を返す', () => {
    const ranges = findMentionRanges('@田中花子', []);
    expect(ranges).toHaveLength(0);
  });

  it('テキストが空の場合は空配列を返す', () => {
    const ranges = findMentionRanges('', テスト人物リスト);
    expect(ranges).toHaveLength(0);
  });

  it('@がない場合は空配列を返す', () => {
    const ranges = findMentionRanges('普通のテキスト', テスト人物リスト);
    expect(ranges).toHaveLength(0);
  });

  it('登録名の連続スペースが入力では1つ: インデックスが入力の文字数に合う', () => {
    // 登録名「山田  太郎」(スペース2つ) に対し、入力は「@山田 太郎」(スペース1つ, 5文字)
    // endIndex は入力テキスト上の "@山田 太郎" の末尾 = 6 になるべき
    const 連続スペース人物: Person[] = [
      { id: 'id-double-space', name: '山田  太郎', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const text = '@山田 太郎 は元気';
    const ranges = findMentionRanges(text, 連続スペース人物);
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('@山田 太郎');
  });

  it('入力に全角スペース: 登録名の半角スペースと正規化でマッチ', () => {
    // 登録名「山田 太郎」(半角スペース) に対し、入力は「@山田\u3000太郎」(全角スペース)
    // endIndex は入力テキスト上の "@山田\u3000太郎" の末尾 = 6 になるべき
    const 半角スペース人物: Person[] = [
      { id: 'id-half-space', name: '山田 太郎', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const text = '@山田\u3000太郎 は元気';
    const ranges = findMentionRanges(text, 半角スペース人物);
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('@山田\u3000太郎');
  });

  it('入力に連続スペース、登録名は1つ: インデックスが入力の文字数に合う', () => {
    // 登録名「Alice Smith」に対し、入力は「@alice  smith」(スペース2つ)
    // endIndex は入力テキスト上の "@alice  smith" の末尾 = 13 になるべき
    const text = '@alice  smith の話';
    const ranges = findMentionRanges(text, テスト人物リスト);
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe('@alice  smith');
  });
});

describe('parseMentions', () => {
  it('@名前 参照を検出して対応する人物IDを返す', () => {
    const text = '@田中花子 と @山田太郎 は友人だ';
    const result = parseMentions(text, テスト人物リスト);
    expect(result.referencedPersonIds).toContain('id-alice');
    expect(result.referencedPersonIds).toContain('id-bob');
  });

  it('存在しない人物名は無視する', () => {
    const text = '@存在しない と @田中花子';
    const result = parseMentions(text, テスト人物リスト);
    expect(result.referencedPersonIds).toEqual(['id-alice']);
  });

  it('@メンションがない場合は空配列を返す', () => {
    const text = '普通のテキスト';
    const result = parseMentions(text, テスト人物リスト);
    expect(result.referencedPersonIds).toEqual([]);
  });

  it('同じ人物を複数回参照しても重複を排除する', () => {
    const text = '@田中花子 と @田中花子 の話';
    const result = parseMentions(text, テスト人物リスト);
    expect(result.referencedPersonIds).toEqual(['id-alice']);
  });

  it('大文字小文字を区別せずにマッチする', () => {
    const text = '@alice smith の話';
    const result = parseMentions(text, テスト人物リスト);
    expect(result.referencedPersonIds).toContain('id-dave');
  });

  it('登録名の連続スペースが入力では1つ: 正しいIDを返す', () => {
    // 登録名「山田  太郎」(スペース2つ) に対し、入力は「@山田 太郎」(スペース1つ)
    const 連続スペース人物: Person[] = [
      { id: 'id-double-space', name: '山田  太郎', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const result = parseMentions('@山田 太郎 は元気', 連続スペース人物);
    expect(result.referencedPersonIds).toContain('id-double-space');
  });

  it('入力に全角スペース、登録名は半角スペース: 正しいIDを返す', () => {
    // 登録名「山田 太郎」(半角スペース) に対し、入力は「@山田\u3000太郎」(全角スペース)
    const 半角スペース人物: Person[] = [
      { id: 'id-half-space', name: '山田 太郎', createdAt: '2024-01-01T00:00:00.000Z' },
    ];
    const result = parseMentions('@山田\u3000太郎 は元気', 半角スペース人物);
    expect(result.referencedPersonIds).toContain('id-half-space');
  });

  it('入力に連続スペース、登録名は1つ: 正しいIDを返す', () => {
    // 登録名「Alice Smith」に対し、入力は「@alice  smith」(スペース2つ)
    const result = parseMentions('@alice  smith の話', テスト人物リスト);
    expect(result.referencedPersonIds).toContain('id-dave');
  });
});
