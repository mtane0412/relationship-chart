/**
 * PairSelectionPanel 用ヘルパー関数・定数
 * 方向インジケーター表示、プレースホルダー生成、KinshipKind/AwarenessKind の日本語ラベルを提供する
 */

import type { RelationshipType, KinshipKind, AwarenessKind } from '@/types/relationship';

/**
 * 表示用の方向インジケーターを返す
 * @param type - 関係タイプ
 * @param isReversed - 関係が逆向きかどうか
 * @returns 方向インジケーター文字列
 */
export function getDirectionIndicator(type: RelationshipType, isReversed: boolean): string {
  if (type === 'bidirectional') {
    return '↔';
  }
  if (type === 'one-way') {
    return isReversed ? '←' : '→';
  }
  return '';
}

/**
 * 関係タイプと種別に応じたプレースホルダーを返す
 * @param type - 関係タイプ
 * @param isReverse - 逆方向かどうか
 * @param hasItem - 物が含まれているかどうか
 */
export function getPlaceholder(type: RelationshipType, isReverse = false, hasItem = false): string {
  if (hasItem) {
    if (type === 'one-way') return '例: 所有、使用';
    if (type === 'bidirectional') return '例: 所有、使用';
    if (type === 'dual-directed') return isReverse ? '例: 使用' : '例: 所有';
    if (type === 'undirected') return '例: 所有、使用';
  }
  if (type === 'one-way') return '例: 片想い、憧れ';
  if (type === 'bidirectional') return '例: 友人、親子、同僚';
  if (type === 'dual-directed') return isReverse ? '例: 無関心、嫌い' : '例: 好き、憧れ';
  if (type === 'undirected') return '例: 同一人物、別名';
  return '例: 関係を入力';
}

/** KinshipKind の日本語ラベル選択肢 */
export const KINSHIP_OPTIONS: { value: KinshipKind; label: string }[] = [
  { value: null, label: '（血縁なし）' },
  { value: 'parent', label: '親' },
  { value: 'child', label: '子' },
  { value: 'sibling', label: '兄弟・姉妹' },
  { value: 'spouse', label: '配偶者' },
  { value: 'partner', label: 'パートナー' },
  { value: 'grandparent', label: '祖父母' },
  { value: 'grandchild', label: '孫' },
  { value: 'cousin', label: 'いとこ' },
  { value: 'relative', label: '親族（その他）' },
];

/** AwarenessKind の日本語ラベル選択肢 */
export const AWARENESS_OPTIONS: { value: AwarenessKind; label: string }[] = [
  { value: null, label: '（未設定）' },
  { value: 'known', label: '認知済み' },
  { value: 'unknown', label: '未認知' },
  { value: 'suspected', label: '疑惑あり' },
];
