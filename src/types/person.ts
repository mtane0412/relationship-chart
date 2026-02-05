/**
 * 人物の型定義
 * 相関図に表示される人物を表現する
 */

/**
 * 人物を表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property name - 人物の名前
 * @property imageDataUrl - 200x200pxにリサイズされた画像のData URL（JPEG形式）。省略可能
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 */
export type Person = {
  id: string;
  name: string;
  imageDataUrl?: string;
  createdAt: string;
};
