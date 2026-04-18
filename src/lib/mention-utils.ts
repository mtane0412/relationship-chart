/**
 * @メンション機能のユーティリティ関数
 *
 * チャット入力バーの @メンション機能で使用する純粋関数群。
 * テキスト内の @ トリガーを検出し、人物参照を解析する。
 */

import type { Person } from '@/types/person';
import { normalizeName } from './person-matching';

/**
 * extractMentionQuery の戻り値型
 */
export type MentionQueryResult = {
  /** @ 以降のクエリ文字列（空文字列の場合もある） */
  query: string;
  /** テキスト内の @ の位置（インデックス） */
  startIndex: number;
};

/**
 * parseMentions の戻り値型
 */
export type ParseMentionsResult = {
  /** テキスト内で参照された人物の ID リスト（重複なし） */
  referencedPersonIds: string[];
};

/**
 * カーソル位置から後方スキャンして、アクティブな @メンション クエリを検出する
 *
 * カーソルの直前にある最後の @ からカーソルまでのテキストをクエリとして返す。
 * @ とカーソルの間にスペースや改行が含まれている場合はメンションが終了しているとみなし null を返す。
 *
 * @param text - テキストエリアの全テキスト
 * @param cursorPosition - 現在のカーソル位置（selectionStart）
 * @returns クエリと @ の開始位置、または null（アクティブなメンションなし）
 */
export function extractMentionQuery(
  text: string,
  cursorPosition: number
): MentionQueryResult | null {
  if (!text || cursorPosition <= 0) return null;

  // カーソル位置より前のテキストを取得
  const beforeCursor = text.slice(0, cursorPosition);

  // カーソルから後方スキャンして @ を探す
  for (let i = beforeCursor.length - 1; i >= 0; i--) {
    const char = beforeCursor[i];

    // スペースや改行に当たったら、メンション範囲外と判断
    if (char === ' ' || char === '\n' || char === '\r' || char === '\u3000') {
      return null;
    }

    // @ を見つけたらクエリを返す
    if (char === '@') {
      const query = beforeCursor.slice(i + 1);
      return { query, startIndex: i };
    }
  }

  return null;
}

/**
 * クエリで人物リストをフィルタリングする（部分一致・大文字小文字無視）
 *
 * @param query - 検索クエリ（空文字列の場合は全件返す）
 * @param persons - フィルタ対象の人物リスト
 * @returns クエリに一致する人物リスト
 */
export function filterPersonsByQuery(query: string, persons: Person[]): Person[] {
  if (!query) return persons;

  const normalizedQuery = normalizeName(query);
  return persons.filter((person) => normalizeName(person.name).includes(normalizedQuery));
}

/**
 * テキスト内の @名前 参照を解析し、対応する人物IDを返す
 *
 * @ の後のテキストに対して、既存人物名との最長一致を試みる。
 * スペースを含む名前（例: "Alice Smith"）にも対応する。
 * 存在しない名前は無視し、重複は排除する。
 *
 * @param text - 解析対象のテキスト
 * @param persons - 照合に使用する人物リスト
 * @returns 参照された人物IDリスト（重複なし）
 */
export function parseMentions(text: string, persons: Person[]): ParseMentionsResult {
  const referencedIds = new Set<string>();

  // 人物名を正規化して長さ降順にソート（最長一致のため）
  const sortedPersons = [...persons].sort(
    (a, b) => b.name.length - a.name.length
  );

  let i = 0;
  while (i < text.length) {
    if (text[i] !== '@') {
      i++;
      continue;
    }

    // @ の直後から始まるテキストを人物名と照合（最長一致）
    const afterAt = text.slice(i + 1);
    let matched = false;

    for (const person of sortedPersons) {
      const normalizedName = normalizeName(person.name);
      const normalizedAfterAt = normalizeName(afterAt.slice(0, person.name.length + 5));

      // 正規化した名前で前方一致を確認
      if (normalizedAfterAt.startsWith(normalizedName)) {
        // 名前の後が文字でないこと（単語境界チェック）を確認
        const endIndex = i + 1 + person.name.length;
        const charAfterName = text[endIndex];
        if (
          charAfterName === undefined ||
          charAfterName === ' ' ||
          charAfterName === '\n' ||
          charAfterName === '\r' ||
          charAfterName === '\u3000' ||
          charAfterName === '。' ||
          charAfterName === '、' ||
          charAfterName === '.' ||
          charAfterName === ',' ||
          charAfterName === '@'
        ) {
          referencedIds.add(person.id);
          i = endIndex;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      i++;
    }
  }

  return { referencedPersonIds: Array.from(referencedIds) };
}
