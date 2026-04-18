/**
 * 人物の型定義
 * 相関図に表示される人物を表現する
 */

/**
 * 人物を表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property name - 人物の名前
 * @property imageDataUrl - 200x200pxにリサイズされた画像のData URL（新規はWebP / 既存データはJPEGも想定）。省略可能
 * @property labels - ノードに付与されたラベル配列（例: ['人物'], ['物']）。省略時は ['人物'] として扱う
 * @property position - ノードの初期位置（Flow座標系）。省略時はランダムな位置に配置される
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 */
export type Person = {
  id: string;
  name: string;
  imageDataUrl?: string;
  labels?: string[];
  position?: { x: number; y: number };
  createdAt: string;
};
