/**
 * 関係の型定義
 * 相関図における人物間の関係を表現する
 * レイヤー（次元）を導入し、同じペア間で多層的な関係を表現できる
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
 * 関係レイヤーの種別
 * 人物間の多層的な関係を分類するためのレイヤー
 * - public: 表（世間的に見える関係）
 * - hidden: 裏（当事者間・読者だけが知る関係）
 * - emotional: 感情（感情的な結びつき）
 * - organizational: 組織（所属・組織関係）
 */
export type RelationshipLayer = 'public' | 'hidden' | 'emotional' | 'organizational';

/**
 * 全レイヤーの定義（UI表示・色分け用）
 */
export const RELATIONSHIP_LAYERS = [
  { value: 'public' as const, label: '表', color: '#64748b', description: '世間的に見える関係' },
  { value: 'hidden' as const, label: '裏', color: '#8b5cf6', description: '当事者間だけの関係' },
  { value: 'emotional' as const, label: '感情', color: '#ef4444', description: '感情的な結びつき' },
  { value: 'organizational' as const, label: '組織', color: '#22c55e', description: '所属・組織関係' },
];

/**
 * デフォルトレイヤー
 * 新規関係追加時にlayerを省略した場合に使用される
 */
export const DEFAULT_LAYER: RelationshipLayer = 'public';

/**
 * 人物間の関係を表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property sourcePersonId - 関係の起点となる人物のID
 * @property targetPersonId - 関係の終点となる人物のID
 * @property isDirected - true=有向、false=無向
 * @property sourceToTargetLabel - sourceからtargetへの関係ラベル（null可）
 * @property targetToSourceLabel - targetからsourceへの関係ラベル（null可）
 * @property layer - 関係レイヤー（表/裏/感情/組織）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 */
export type Relationship = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  isDirected: boolean;
  sourceToTargetLabel: string | null;
  targetToSourceLabel: string | null;
  layer: RelationshipLayer;
  createdAt: string;
};
