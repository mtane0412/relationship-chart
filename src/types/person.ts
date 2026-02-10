/**
 * 人物の型定義
 * 相関図に表示される人物を表現する
 */

/**
 * ノードの種別
 * 'person' - 人物ノード（円形表示）
 * 'item' - 物ノード（角丸四角形表示）
 */
export type NodeKind = 'person' | 'item';

/**
 * 人物を表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property name - 人物の名前
 * @property imageDataUrl - 200x200pxにリサイズされた画像のData URL（JPEG形式）。省略可能
 * @property kind - ノードの種別（'person' or 'item'）。省略時は'person'として扱う
 * @property position - ノードの初期位置（Flow座標系）。省略時はランダムな位置に配置される
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 */
export type Person = {
  id: string;
  name: string;
  imageDataUrl?: string;
  kind?: NodeKind;
  position?: { x: number; y: number };
  createdAt: string;
};
