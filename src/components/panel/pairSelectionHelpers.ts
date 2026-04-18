/**
 * PairSelectionPanel 用ヘルパー定数
 * v11対応: AwarenessKind の日本語ラベル選択肢を提供する
 * （KinshipKind・RelationshipType は v11 で廃止）
 */

import type { AwarenessKind } from '@/types/relationship';

/** AwarenessKind の日本語ラベル選択肢 */
export const AWARENESS_OPTIONS: { value: AwarenessKind; label: string }[] = [
  { value: null, label: '（未設定）' },
  { value: 'known', label: '認知済み' },
  { value: 'unknown', label: '未認知' },
  { value: 'suspected', label: '疑惑あり' },
];
