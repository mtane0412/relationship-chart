/**
 * 関係の型定義
 * 相関図における人物間の関係を表現する
 */

/**
 * 関係のタイプ
 * - bidirectional: 双方向（例: 親子）、矢印: ↔、ラベル: 1つ（中央）
 * - dual-directed: 片方向×2（例: 好きと無関心）、矢印: → ←、ラベル: 2つ（各方向）
 * - one-way: 片方向×1（例: 片想い）、矢印: →、ラベル: 1つ
 * - undirected: 無方向（例: 同一人物）、矢印: なし、ラベル: 1つ
 */
export type RelationshipType = 'bidirectional' | 'dual-directed' | 'one-way' | 'undirected';

/**
 * 人物間の関係を表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property sourcePersonId - 関係の起点となる人物のID
 * @property targetPersonId - 関係の終点となる人物のID
 * @property isDirected - true=有向、false=無向
 * @property sourceToTargetLabel - sourceからtargetへの関係ラベル（null可）
 * @property targetToSourceLabel - targetからsourceへの関係ラベル（null可）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 */
export type Relationship = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  isDirected: boolean;
  sourceToTargetLabel: string | null;
  targetToSourceLabel: string | null;
  createdAt: string;
};
