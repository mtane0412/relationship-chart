/**
 * @メンション機能のユーティリティ関数
 *
 * チャット入力バーの @メンション機能で使用する純粋関数群。
 * テキスト内の @ トリガーを検出し、人物参照を解析する。
 */

import type { Person } from '@/types/person';
import { normalizeName } from './person-matching';

/**
 * メンションドロップダウンに表示する最大件数
 * MentionDropdown と useMention で共有する定数。
 */
export const MENTION_MAX_DISPLAY_COUNT = 10;

/**
 * メンションの区切り文字セット
 * @ の後の名前の終端として認識する文字の集合。
 */
const MENTION_TERMINATORS = new Set([
  ' ', '\t', '\n', '\r',
  '\u3000',             // 全角スペース
  '。', '、', '.', ',', // 句読点
  '@',                  // 別のメンション開始
]);

/**
 * 正規化後の文字列長に対応する、元テキスト上の位置を返す
 *
 * normalizeName() は連続空白→1文字・全角空白→半角への圧縮・trim()・toLowerCase() を行うため、
 * 正規化前後で文字列長が変わりうる。この関数は rawText の前方から1文字ずつスキャンしながら
 * normalizeName(rawText.slice(0, rawPos)).length を実際に測定し、
 * 正規化後の文字数が normalizedTargetLength に達した時点の rawPos を返す。
 *
 * normalizeName を実際に呼び出すことで、toLowerCase() によって文字数が増えるUnicode文字
 * （例: 'İ'（U+0130）→ 'i\u0307'（2文字））にも正確に対応できる。
 *
 * 用途: 正規化でマッチした名前が、入力テキスト上で何文字分を占めるかを求める。
 *
 * @param rawText - 走査対象の元テキスト（@ の直後から始まる部分文字列）
 * @param normalizedTargetLength - 正規化後の目標文字数
 * @returns 目標文字数を消費した rawText 上の位置、到達できない場合は null
 */
export function findRawEndPosition(rawText: string, normalizedTargetLength: number): number | null {
  // rawPos を 0 から順に試行し、normalizeName(rawText.slice(0, rawPos)).length が
  // normalizedTargetLength に一致する最小の rawPos を返す
  for (let rawPos = 0; rawPos <= rawText.length; rawPos++) {
    const normalizedLen = normalizeName(rawText.slice(0, rawPos)).length;
    if (normalizedLen === normalizedTargetLength) {
      return rawPos;
    }
    if (normalizedLen > normalizedTargetLength) {
      // 目標長を超えた: toLowerCase() による文字数増加などで到達不能
      return null;
    }
  }
  return null;
}

/**
 * matchMentionAt の戻り値型
 */
type MentionMatch = {
  /** マッチした人物 */
  person: Person;
  /** @ の直後からメンション末尾までの rawText 上のオフセット（バイト数ではなく文字数） */
  rawEndOffset: number;
};

/**
 * 指定した @ の位置から始まるメンションを検索する
 *
 * sortedPersons（名前の長さ降順）を順に試行し、
 * 正規化後の名前と一致するものが見つかれば MentionMatch を返す。
 * 一致しない場合は null を返す。
 *
 * findMentionRanges と parseMentions で共通する重複ロジックを統合するための内部ヘルパー。
 *
 * @param text - 解析対象の全テキスト
 * @param atIndex - @ の位置（text[atIndex] === '@' であること）
 * @param sortedPersons - 名前の長さ降順にソート済みの人物リスト
 * @returns マッチ結果、または null
 */
function matchMentionAt(text: string, atIndex: number, sortedPersons: Person[]): MentionMatch | null {
  const afterAt = text.slice(atIndex + 1);

  for (const person of sortedPersons) {
    const normalizedName = normalizeName(person.name);
    // afterAt の正規化後 normalizedName.length 文字分が、元テキストで何文字かを求める
    const rawEndPos = findRawEndPosition(afterAt, normalizedName.length);
    if (rawEndPos === null) continue;

    // 実際に切り出して正規化し、登録名の正規化と一致するか確認
    if (normalizeName(afterAt.slice(0, rawEndPos)) !== normalizedName) continue;

    // 名前の直後が区切り文字（またはテキスト末尾）であることを確認（単語境界チェック）
    if (isMentionTerminator(text[atIndex + 1 + rawEndPos])) {
      return { person, rawEndOffset: rawEndPos };
    }
  }

  return null;
}

/**
 * 与えられた文字がメンションの区切り文字かどうかを判定する
 *
 * @param char - 検査する文字（undefined の場合はテキスト末尾 = 区切りとみなす）
 * @returns 区切り文字なら true
 */
function isMentionTerminator(char: string | undefined): boolean {
  return char === undefined || MENTION_TERMINATORS.has(char);
}

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

    // @ を見つけたらクエリを返す
    if (char === '@') {
      const query = beforeCursor.slice(i + 1);
      return { query, startIndex: i };
    }

    // 区切り文字に当たったら、メンション範囲外と判断
    if (isMentionTerminator(char)) {
      return null;
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
 * テキスト内で有効なメンション（既存人物に一致する @名前）の位置情報
 */
export type MentionRange = {
  /** @ の位置（インデックス） */
  start: number;
  /** 名前の末尾の次の位置（end は含まない: text.slice(start, end) で "@名前" を取得） */
  end: number;
};

/**
 * テキスト内の有効なメンション（既存人物に一致する @名前）の位置を返す
 *
 * parseMentions と同じアルゴリズムで最長一致を使用するが、
 * 人物IDではなく位置情報（start/end インデックス）を返す。
 * ハイライトオーバーレイのレンダリングに使用する。
 *
 * @param text - 解析対象のテキスト
 * @param persons - 照合に使用する人物リスト
 * @param presorted - true の場合、persons はすでに名前の長さ降順にソートされているとみなしてソートをスキップする
 *                    入力中のレンダリングなど高頻度の呼び出し時に useMemo でソート済みリストを渡すことで O(N log N) を削減できる
 * @returns 有効なメンションの位置情報リスト
 */
export function findMentionRanges(text: string, persons: Person[], presorted = false): MentionRange[] {
  if (!text || persons.length === 0) return [];

  const ranges: MentionRange[] = [];
  // presorted=true の場合はソートをスキップしてコストを削減する
  const sortedPersons = presorted
    ? persons
    : [...persons].sort((a, b) => b.name.length - a.name.length);

  let i = 0;
  while (i < text.length) {
    if (text[i] !== '@') {
      i++;
      continue;
    }

    const match = matchMentionAt(text, i, sortedPersons);
    if (match !== null) {
      const endIndex = i + 1 + match.rawEndOffset;
      ranges.push({ start: i, end: endIndex });
      i = endIndex;
    } else {
      i++;
    }
  }

  return ranges;
}

/**
 * 文字列配列の最長共通プレフィックスを返す（Tab補完用）
 *
 * ターミナル補完のように、複数候補に共通する先頭部分を返す。
 * 配列が空または共通プレフィックスがない場合は空文字列を返す。
 *
 * @param strs - 比較対象の文字列配列
 * @returns 最長共通プレフィックス
 */
export function findCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return '';
  if (strs.length === 1) return strs[0];

  const first = strs[0];
  let prefix = '';

  for (let i = 0; i < first.length; i++) {
    const char = first[i];
    // すべての文字列がこの文字で一致するか確認
    if (strs.every((s) => s[i] === char)) {
      prefix += char;
    } else {
      break;
    }
  }

  return prefix;
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
    const match = matchMentionAt(text, i, sortedPersons);
    if (match !== null) {
      referencedIds.add(match.person.id);
      i = i + 1 + match.rawEndOffset;
    } else {
      i++;
    }
  }

  return { referencedPersonIds: Array.from(referencedIds) };
}
