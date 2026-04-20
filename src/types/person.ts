/**
 * 人物（ノード）の型定義
 *
 * プロパティグラフ方式 v15 に基づく設計:
 * - labels: string[] 必須（プロパティグラフのノードラベルに対応）
 * - properties: Record<string, unknown> で任意のカスタムプロパティを拡張可能
 * - name / imageDataUrl はファーストクラスフィールドとして維持（UI表示の主軸）
 * - v15 で tags / narrative / colorOverride / updatedAt を追加（Relationship との対称性）
 */

/**
 * 人物の物語的自由記述
 *
 * @property summary - 人物の概要・説明（null は未記入）
 * @property notes - 補足メモ（null は未記入）
 */
export type PersonNarrative = {
  summary: string | null;
  notes: string | null;
};

/**
 * 人物を表す型（v15・プロパティグラフ方式）
 * @property id - 一意な識別子（nanoidで生成）
 * @property labels - ノードに付与されたラベル配列（例: ['人物'], ['物']）。必須。
 * @property name - 人物・アイテムの名前（表示名として特別扱い）
 * @property imageDataUrl - 200x200pxにリサイズされた画像のData URL（WebP/JPEG）。省略可能。
 * @property position - ノードの初期位置（Flow座標系）。省略時はランダム配置。
 * @property tags - 分類タグ配列（空配列は未設定）
 * @property narrative - 物語的自由記述（概要・補足メモ）
 * @property colorOverride - ノード色の手動上書き（null は未設定）
 * @property properties - カスタムプロパティ（任意のkey-value）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 * @property updatedAt - 最終更新日時（ISO 8601形式の文字列）
 */
export type Person = {
  id: string;
  labels: string[];
  name: string;
  imageDataUrl?: string;
  position?: { x: number; y: number };
  tags: string[];
  narrative: PersonNarrative;
  colorOverride: string | null;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
