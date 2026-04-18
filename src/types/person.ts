/**
 * 人物（ノード）の型定義
 *
 * プロパティグラフ方式 v11 に基づく設計:
 * - labels: string[] 必須（プロパティグラフのノードラベルに対応）
 * - properties: Record<string, unknown> で任意のカスタムプロパティを拡張可能
 * - name / imageDataUrl はファーストクラスフィールドとして維持（UI表示の主軸）
 */

/**
 * 人物を表す型（v11・プロパティグラフ方式）
 * @property id - 一意な識別子（nanoidで生成）
 * @property labels - ノードに付与されたラベル配列（例: ['人物'], ['物']）。必須。
 * @property name - 人物・アイテムの名前（表示名として特別扱い）
 * @property imageDataUrl - 200x200pxにリサイズされた画像のData URL（WebP/JPEG）。省略可能。
 * @property position - ノードの初期位置（Flow座標系）。省略時はランダム配置。
 * @property properties - カスタムプロパティ（任意のkey-value）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 */
export type Person = {
  id: string;
  labels: string[];
  name: string;
  imageDataUrl?: string;
  position?: { x: number; y: number };
  properties: Record<string, unknown>;
  createdAt: string;
};
