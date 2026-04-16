/**
 * 関係の型定義
 * 相関図における人物間の関係を表現する
 * レイヤー（次元）を導入し、同じペア間で多層的な関係を表現できる
 * 各レイヤーはスキーマ（方向性・ラベル体系・重み）を持つ
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
 * 人物間の多層的な関係を次元別に分類する
 * - general: 一般（基本的な関係）
 * - emotional: 感情（感情的な結びつき）
 * - organizational: 組織（所属・組織関係）
 * - awareness: 認知（正体・情報の認知状況）
 */
export type RelationshipLayer = 'general' | 'emotional' | 'organizational' | 'awareness';

/**
 * ラベル体系の種別
 * - fixed: 定型（suggestedLabelsから選択必須）
 * - semi-fixed: 半定型（suggestedLabelsを候補として表示、自由入力も可）
 * - free: 自由（ユーザーが自由に入力）
 */
export type LabelSystem = 'fixed' | 'semi-fixed' | 'free';

/**
 * レイヤーのスキーマ定義
 * @property value - レイヤー識別子
 * @property label - 表示ラベル
 * @property color - エッジ色（HEX）
 * @property description - 説明文
 * @property defaultDirected - デフォルトの方向性（true=有向）
 * @property allowDirectionOverride - ユーザーが方向を変更できるか
 * @property labelSystem - ラベル体系
 * @property suggestedLabels - 候補ラベル（fixed/semi-fixedのとき使用）
 * @property supportsWeight - 重み（強度）をサポートするか
 */
export type RelationshipLayerDef = {
  value: RelationshipLayer;
  label: string;
  color: string;
  description: string;
  defaultDirected: boolean;
  allowDirectionOverride: boolean;
  labelSystem: LabelSystem;
  suggestedLabels?: readonly string[];
  supportsWeight: boolean;
};

/**
 * 全レイヤーのスキーマ定義（UI表示・入力制御・色分け用）
 */
export const RELATIONSHIP_LAYERS: readonly RelationshipLayerDef[] = [
  {
    value: 'general',
    label: '一般',
    color: '#64748b',
    description: '基本的な関係',
    defaultDirected: false,
    allowDirectionOverride: true,
    labelSystem: 'semi-fixed',
    suggestedLabels: ['友人', '知人', '恋人', 'ライバル', '師弟'],
    supportsWeight: false,
  },
  {
    value: 'emotional',
    label: '感情',
    color: '#ef4444',
    description: '感情的な結びつき',
    defaultDirected: true,
    allowDirectionOverride: true,
    labelSystem: 'free',
    supportsWeight: true,
  },
  {
    value: 'organizational',
    label: '組織',
    color: '#22c55e',
    description: '所属・組織関係',
    defaultDirected: true,
    allowDirectionOverride: true,
    labelSystem: 'semi-fixed',
    suggestedLabels: ['上司', '部下', '同僚', 'メンバー', 'ボス'],
    supportsWeight: false,
  },
  {
    value: 'awareness',
    label: '認知',
    color: '#8b5cf6',
    description: '正体・情報の認知状況',
    defaultDirected: true,
    allowDirectionOverride: false,
    labelSystem: 'fixed',
    suggestedLabels: ['知っている', '知らない', '疑っている'],
    supportsWeight: false,
  },
];

/**
 * デフォルトレイヤー
 * 新規関係追加時にlayerを省略した場合に使用される
 */
export const DEFAULT_LAYER: RelationshipLayer = 'general';

/**
 * 人物間の関係を表す型
 * @property id - 一意な識別子（nanoidで生成）
 * @property sourcePersonId - 関係の起点となる人物のID
 * @property targetPersonId - 関係の終点となる人物のID
 * @property isDirected - true=有向、false=無向
 * @property sourceToTargetLabel - sourceからtargetへの関係ラベル（null可）
 * @property targetToSourceLabel - targetからsourceへの関係ラベル（null可）
 * @property layer - 関係レイヤー（一般/感情/組織/認知）
 * @property weight - 関係の重み・強度（0.0〜1.0、nullは重みなし）
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
  weight: number | null;
  createdAt: string;
};
