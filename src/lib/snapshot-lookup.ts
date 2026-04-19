/**
 * スナップショット検索ユーティリティ
 *
 * turningPoints[].at 文字列と snapshot.label を照合して
 * 該当スナップショットのインデックスを返す。
 *
 * マッチング方式: 正規化済み完全一致（normalizeName を流用）
 *   - trim
 *   - 連続する空白（全角・半角）を半角スペース1つに正規化
 *   - 大文字小文字を無視（toLowerCase）
 */

import { normalizeName } from './person-matching';
import type { Snapshot } from '@/types/snapshot';

/**
 * スナップショット配列からラベルが一致する最初のインデックスを返す。
 *
 * @param label - 検索するラベル文字列（turningPoints[].at 等）
 * @param snapshots - 検索対象のスナップショット配列
 * @returns 一致したスナップショットの 0 始まりインデックス。見つからない場合は null
 */
export function findSnapshotIndexByLabel(label: string, snapshots: Snapshot[]): number | null {
  if (!label.trim()) return null;
  const normalizedLabel = normalizeName(label);
  const index = snapshots.findIndex((s) => normalizeName(s.label) === normalizedLabel);
  return index === -1 ? null : index;
}
