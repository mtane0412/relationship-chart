/**
 * 関係（エッジ）の型定義
 *
 * プロパティグラフ方式 v11 に基づく設計:
 * - type: string でエッジの意味的な型ラベルを持つ（例: "友人", "同僚", "好き"）
 * - 各エッジは単一方向（sourceId → targetId）。非対称な関係は2本の別エッジで表現。
 * - symmetric: true で無向表示（矢印なし）。双方向の関係を1本で表す場合に使用。
 * - properties: RelationshipProperties で型付きドメイン属性 + 任意拡張が可能。
 * - 1ペア間に複数エッジを許容（マルチグラフ）。
 *
 * v10以前（RelationshipV9）との主な変更:
 * - sourcePersonId/targetPersonId → sourceId/targetId（ノードが人物以外にも対応）
 * - isDirected: boolean 廃止 → symmetric: boolean（全エッジが有向、symmetricは表示制御）
 * - forward/reverse 構造廃止（1エッジ=1方向）
 * - kinship 廃止（エッジtype "親子"等で表現）
 * - symmetric/directional プロパティ → properties 配下に統合
 * - 1ペア1エッジのマージ強制を廃止
 */

/**
 * 正体・情報の認知状況
 * null は認知情報なし（または不明）を意味する
 */
export type AwarenessKind = 'known' | 'unknown' | 'suspected' | null;

/**
 * 関係の自由記述（narrative）
 * @property summary - 関係全体の物語的記述
 * @property notes - メモ・補足
 * @property turningPoints - ターニングポイントのリスト（時刻と内容）
 */
export type RelationshipNarrative = {
  summary: string | null;
  notes: string | null;
  turningPoints: Array<{ at: string; note: string }>;
};

/**
 * エッジのプロパティ型
 *
 * ドメイン特化の既知プロパティをTypeScriptで型付けしつつ、
 * インデックスシグネチャで任意のカスタムプロパティ追加を許容する。
 *
 * プロパティの意味:
 * - closeness: 親密度（0.0~1.0）
 * - trust: 信頼度（0.0~1.0）
 * - tension: 緊張・対立度（0.0~1.0）
 * - secrecy: 秘匿性（0.0~1.0、周囲から隠されているか）
 * - affection: 好悪の強度（-1.0~1.0、起点→終点視点）
 * - awareness: 起点から終点への認知状況（known/unknown/suspected）
 * - role: 起点の終点に対する役割ラベル（例: "上司", "師匠"）
 * - [key: string]: 任意のカスタムプロパティ
 */
export type RelationshipProperties = {
  closeness?: number | null;
  trust?: number | null;
  tension?: number | null;
  secrecy?: number | null;
  affection?: number | null;
  awareness?: AwarenessKind;
  role?: string | null;
  [key: string]: unknown;
};

/**
 * 人物間の関係を表す型（v11・プロパティグラフ方式）
 *
 * @property id - 一意な識別子（nanoidで生成）
 * @property type - エッジ型ラベル（例: "友人", "同僚", "好き", "親子"）
 * @property sourceId - 起点ノードID（旧: sourcePersonId）
 * @property targetId - 終点ノードID（旧: targetPersonId）
 * @property label - 表示ラベル（null の場合は type を使用）
 * @property symmetric - true=無向表示（矢印なし）、false=有向（矢印あり）
 * @property tags - 補助的な分類タグ配列（色派生・フィルタの補助軸）
 * @property narrative - 自由記述
 * @property colorOverride - エッジ色の手動上書き（null の場合はプロパティから派生）
 * @property properties - ドメイン属性 + 任意カスタムプロパティ
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 * @property updatedAt - 最終更新日時（ISO 8601形式の文字列）
 */
export type Relationship = {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  label: string | null;
  symmetric: boolean;
  tags: string[];
  narrative: RelationshipNarrative;
  colorOverride: string | null;
  properties: RelationshipProperties;
  createdAt: string;
  updatedAt: string;
};

/**
 * タグ入力のサジェスト候補
 * ユーザーがタグを入力する際の補完候補として使用する
 */
export const SUGGESTED_TAGS = [
  '元同僚',
  '同級生',
  '幼馴染',
  '上司',
  '部下',
  '師匠',
  '弟子',
  '親友',
  'ライバル',
  '協力関係',
  '対立',
  '正体認知',
  '片想い',
  '秘密の関係',
] as const;

/**
 * エッジ型のサジェスト候補
 * ユーザーがエッジのtypeを入力する際の補完候補として使用する
 */
export const SUGGESTED_TYPES = [
  '友人',
  '親友',
  '同僚',
  '上司',
  '部下',
  '師弟',
  '恋人',
  '配偶者',
  '親子',
  '兄弟',
  '祖父母',
  '親族',
  'ライバル',
  '協力',
  '対立',
  '片想い',
  '好き',
  '尊敬',
  '信頼',
] as const;

/**
 * エッジフィルタの述語
 * 定型数値による絞り込み条件と、エッジタイプによる絞り込みを表す
 */
export type EdgePredicate =
  | { type: 'closeness_gte'; value: number }
  | { type: 'trust_gte'; value: number }
  | { type: 'tension_gte'; value: number }
  | { type: 'secrecy_gte'; value: number }
  | { type: 'edge_type_is'; value: string };

/**
 * エッジフィルタの状態
 * タグフィルタ（ANY/ALL モード）と述語フィルタの組み合わせで関係を絞り込む
 *
 * @property tags.mode - 'any': いずれかのタグが一致すればOK / 'all': 全タグが一致する必要あり
 * @property tags.values - フィルタ対象の重複なしタグ配列（空の場合はタグ絞り込みなし）
 * @property predicates - 追加述語フィルタ（全て通過する必要あり）
 */
export type EdgeFilter = {
  tags: {
    mode: 'any' | 'all';
    values: string[];
  };
  predicates: EdgePredicate[];
};

/**
 * エッジフィルタの初期値（全エッジを表示）
 */
export const INITIAL_EDGE_FILTER: EdgeFilter = {
  tags: { mode: 'any', values: [] },
  predicates: [],
};

/**
 * タグと色のマッピング
 * タグから色を派生させるために使用する
 */
export const TAG_COLOR_MAP: Record<string, string> = {
  元同僚: '#22c55e',
  同級生: '#22c55e',
  上司: '#22c55e',
  部下: '#22c55e',
  師匠: '#22c55e',
  弟子: '#22c55e',
  正体認知: '#8b5cf6',
  片想い: '#ef4444',
  対立: '#ef4444',
};

/**
 * エッジ型と色のマッピング
 * エッジ type から色を派生させるために使用する
 */
export const TYPE_COLOR_MAP: Record<string, string> = {
  親子: '#22c55e',
  兄弟: '#22c55e',
  配偶者: '#22c55e',
  祖父母: '#22c55e',
  親族: '#22c55e',
  恋人: '#ef4444',
  片想い: '#ef4444',
  対立: '#ef4444',
  ライバル: '#f97316',
};
