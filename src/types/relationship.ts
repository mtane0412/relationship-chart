/**
 * 関係の型定義
 * 相関図における人物間の関係を表現する
 */

/**
 * 人物間の関係を表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property sourcePersonId - 関係の起点となる人物のID
 * @property targetPersonId - 関係の終点となる人物のID
 * @property label - 関係のラベル（"恋人", "上司", "友人" 等）
 * @property isDirected - 方向性のある関係か（true: A→B, false: A↔B）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 */
export type Relationship = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  label: string;
  isDirected: boolean;
  createdAt: string;
};
