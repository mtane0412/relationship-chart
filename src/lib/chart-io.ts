/**
 * Chart エクスポート/インポート ユーティリティ
 *
 * Chart全体をJSON形式でエクスポートし、JSONファイルからChartをインポートするコアロジックを提供する。
 * - エクスポート: Chart → JSONファイルダウンロード
 * - インポート: JSON文字列 → バリデーション → ID振り直し → 新規Chart
 *
 * 設計方針:
 * - 純粋関数として実装（副作用は downloadChartJson のみ）
 * - インポート時はID衝突を避けるため全階層のIDを振り直す
 * - normalizeChart() を経由してスキーママイグレーションを適用
 */

import { nanoid } from 'nanoid';
import type { Chart } from '@/types/chart';
import type { Snapshot } from '@/types/snapshot';
import { normalizeChart } from './migration';

// ─── ファイル名サニタイズ ──────────────────────────────────────────────────────

/** ファイルシステムで使用できない禁止文字の正規表現 */
const FILENAME_FORBIDDEN_CHARS = /[/\\:*?"<>|]/g;

/** チャート名が空またはすべて禁止文字の場合のフォールバックファイル名 */
const FALLBACK_FILENAME = 'chart-export';

/**
 * チャート名からファイル名として安全な文字列を生成する
 *
 * @param chartName - 元のチャート名
 * @returns サニタイズ済みファイル名（拡張子なし）。空文字列またはサニタイズ後に空になった場合は 'chart-export' を返す
 */
export function sanitizeFilename(chartName: string): string {
  if (!chartName) {
    return FALLBACK_FILENAME;
  }
  const sanitized = chartName.replace(FILENAME_FORBIDDEN_CHARS, '_');
  // サニタイズ後に空文字列になった場合もフォールバック（禁止文字のみで構成されていた場合）
  return sanitized || FALLBACK_FILENAME;
}

// ─── シリアライズ ─────────────────────────────────────────────────────────────

/**
 * Chart をエクスポート用 JSON 文字列に変換する
 *
 * @param chart - エクスポート対象の Chart オブジェクト
 * @returns インデント付きJSON文字列（人間可読形式）
 */
export function serializeChartForExport(chart: Chart): string {
  return JSON.stringify(chart, null, 2);
}

// ─── ダウンロード ─────────────────────────────────────────────────────────────

/**
 * JSON 文字列を .json ファイルとしてダウンロードする
 *
 * @param json - JSON 文字列
 * @param filename - ダウンロードファイル名（拡張子を含む）
 */
export function downloadChartJson(json: string, filename: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  // DOMに追加してクリック、その後クリーンアップ
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ─── バリデーション ───────────────────────────────────────────────────────────

/**
 * インポートデータのバリデーション結果
 */
export type ValidateChartResult =
  | { ok: true; chart: Chart }
  | { ok: false; error: string };

/**
 * インポートしたデータが Chart として妥当か最低限の構造チェックを行う
 *
 * @param data - JSON.parse した結果の unknown 値
 * @returns バリデーション結果。成功時は Chart オブジェクトを返す
 *
 * @remarks
 * - zodを使用せず手動チェックで最低限の構造確認のみ行う
 * - 内部構造の詳細はnormalizeChart()が補完するため厳密チェック不要
 */
export function validateChartData(data: unknown): ValidateChartResult {
  if (typeof data !== 'object' || data === null) {
    return { ok: false, error: '不正なデータ形式です（オブジェクトではありません）' };
  }

  const obj = data as Record<string, unknown>;

  // name: 文字列かつ空でない
  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    return { ok: false, error: 'チャート名（name）が見つからないか無効です' };
  }

  // persons: 配列
  if (!Array.isArray(obj.persons)) {
    return { ok: false, error: 'persons フィールドが配列ではありません' };
  }

  // relationships: 配列
  if (!Array.isArray(obj.relationships)) {
    return { ok: false, error: 'relationships フィールドが配列ではありません' };
  }

  // createdAt: 文字列
  if (typeof obj.createdAt !== 'string') {
    return { ok: false, error: 'createdAt フィールドが見つからないか無効です' };
  }

  // updatedAt: 文字列
  if (typeof obj.updatedAt !== 'string') {
    return { ok: false, error: 'updatedAt フィールドが見つからないか無効です' };
  }

  // 注意: id フィールドは検証しない。このバリデーション結果は必ず prepareChartForImport() と組み合わせて使用すること。
  // prepareChartForImport() が normalizeChart() を経由して id を設定する。
  return { ok: true, chart: data as Chart };
}

// ─── インポート準備 ───────────────────────────────────────────────────────────

/**
 * インポートした Chart データの全IDを振り直し、新しい Chart として準備する
 *
 * @param chart - バリデーション済みの Chart
 * @returns 全階層のIDが振り直された新しい Chart
 *
 * @remarks
 * ID振り直しの対象:
 * - Chart.id
 * - Person.id（全Person）
 * - Relationship.id, sourceId, targetId（全Relationship）
 * - Snapshot内のpersonId, relationshipId, sourceId, targetId（全Snapshot）
 *
 * normalizeChart() を経由してスキーママイグレーションを適用するため、
 * 古いスキーマバージョンのデータもインポート可能。
 */
export function prepareChartForImport(chart: Chart): Chart {
  // スキーママイグレーションを適用（古いバージョンのデータを最新形式に変換）
  const normalized = normalizeChart(chart);

  // Person: 旧ID → 新IDのマッピングテーブルを作成
  const personIdMap = new Map<string, string>();
  for (const person of normalized.persons) {
    personIdMap.set(person.id, nanoid());
  }

  // Relationship: 旧ID → 新IDのマッピングテーブルを作成
  const relationshipIdMap = new Map<string, string>();
  for (const rel of normalized.relationships) {
    relationshipIdMap.set(rel.id, nanoid());
  }

  // Personを新IDで複製
  const newPersons = normalized.persons.map((person) => ({
    ...person,
    id: personIdMap.get(person.id) ?? nanoid(),
  }));

  // Relationshipを新IDで複製（sourceId/targetIdもPersonマッピングで変換）
  const newRelationships = normalized.relationships.map((rel) => {
    // PersonIDのマッピングが見つからない場合は元のIDを維持してログ出力
    // （インポートデータの整合性が崩れている可能性があるが、Fail-Fastよりデータ保全を優先）
    if (!personIdMap.has(rel.sourceId)) {
      console.warn(
        `[prepareChartForImport] sourceId のマッピングが見つかりません: relationshipId=${rel.id}, sourceId=${rel.sourceId}`
      );
    }
    if (!personIdMap.has(rel.targetId)) {
      console.warn(
        `[prepareChartForImport] targetId のマッピングが見つかりません: relationshipId=${rel.id}, targetId=${rel.targetId}`
      );
    }
    return {
      ...rel,
      id: relationshipIdMap.get(rel.id) ?? nanoid(),
      sourceId: personIdMap.get(rel.sourceId) ?? rel.sourceId,
      targetId: personIdMap.get(rel.targetId) ?? rel.targetId,
    };
  });

  // Snapshotを新IDで複製（全参照IDをマッピングで変換）
  const newSnapshots = (normalized.snapshots ?? []).map((snapshot) =>
    remapSnapshotIds(snapshot, personIdMap, relationshipIdMap)
  );

  return {
    ...normalized,
    id: nanoid(),
    persons: newPersons,
    relationships: newRelationships,
    snapshots: newSnapshots,
    // createdAt/updatedAt/nameは元データを維持（インポート元のメタデータを尊重）
  };
}

/**
 * Snapshot内の全参照IDをマッピングテーブルで変換する
 *
 * @param snapshot - 変換対象のSnapshot
 * @param personIdMap - Person旧ID→新IDのマッピング
 * @param relationshipIdMap - Relationship旧ID→新IDのマッピング
 * @returns IDが変換された新しいSnapshot
 */
function remapSnapshotIds(
  snapshot: Snapshot,
  personIdMap: Map<string, string>,
  relationshipIdMap: Map<string, string>
): Snapshot {
  return {
    ...snapshot,
    persons: snapshot.persons.map((sp) => ({
      ...sp,
      personId: personIdMap.get(sp.personId) ?? sp.personId,
    })),
    relationships: snapshot.relationships.map((sr) => ({
      ...sr,
      relationshipId: relationshipIdMap.get(sr.relationshipId) ?? sr.relationshipId,
      sourceId: personIdMap.get(sr.sourceId) ?? sr.sourceId,
      targetId: personIdMap.get(sr.targetId) ?? sr.targetId,
    })),
  };
}
