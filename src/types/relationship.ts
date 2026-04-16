/**
 * 関係の型定義
 * 相関図における人物間の関係を表現する
 *
 * 【v9以降】プロパティグラフ方式（RelationshipV9）を採用
 *   1本のエッジに多次元プロパティ（タグ・定型数値・自由記述・方向非対称）を持たせる
 *
 * 【v8以前】レイヤーベース方式（LegacyRelationshipV8 / Relationship 型）
 *   マイグレーション（migration.ts）でのみ使用。新規コードでは RelationshipV9 を使用すること。
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
 * 人物間の関係を表す型（v8以前・レイヤーベース方式）
 * @property id - 一意な識別子（nanoidで生成）
 * @property sourcePersonId - 関係の起点となる人物のID
 * @property targetPersonId - 関係の終点となる人物のID
 * @property isDirected - true=有向、false=無向
 * @property sourceToTargetLabel - sourceからtargetへの関係ラベル（null可）
 * @property targetToSourceLabel - targetからsourceへの関係ラベル（null可）
 * @property layer - 関係レイヤー（一般/感情/組織/認知）
 * @property weight - 関係の重み・強度（0.0〜1.0、nullは重みなし）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 * @deprecated v9以降は RelationshipV9 を使用すること。Phase 2 で Relationship = RelationshipV9 に切り替え予定。
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

/**
 * v8以前のレイヤーベース関係型（マイグレーション用エイリアス）
 * 現行の Relationship 型と同一。v8→v9 マイグレーション関数の入力型として使用する。
 */
export type LegacyRelationshipV8 = Relationship;

// ─── v9 プロパティグラフ方式の型定義 ──────────────────────────────────────────

/**
 * 血縁・親族関係の種別
 * null は血縁なし（または不明）を意味する
 */
export type KinshipKind =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'partner'
  | 'grandparent'
  | 'grandchild'
  | 'cousin'
  | 'relative'
  | null;

/**
 * 正体・情報の認知状況
 * null は認知情報なし（または不明）を意味する
 */
export type AwarenessKind = 'known' | 'unknown' | 'suspected' | null;

/**
 * 方向ごとのプロパティ（source→target または target→source 視点の非対称情報）
 * @property label - 方向ラベル（例: "好き", "上司"）。v8 の sourceToTargetLabel 相当。
 * @property affection - 好悪の向き強度（-1.0 〜 1.0、null は未設定）
 * @property awareness - 相手の正体・情報の認知状況
 * @property role - 役割ラベル（例: "上司", "師匠"）
 */
export type DirectionalProps = {
  label: string | null;
  affection: number | null;
  awareness: AwarenessKind;
  role: string | null;
};

/**
 * 方向対称なプロパティ（両方向で共通の関係属性）
 * @property closeness - 親密度（0.0〜1.0、v8 の weight の意味的後継）
 * @property trust - 信頼度（0.0〜1.0）
 * @property tension - 緊張・対立度（0.0〜1.0）
 * @property secrecy - 秘匿性（0.0〜1.0、周囲から隠されているか）
 * @property kinship - 血縁・親族の種別
 */
export type SymmetricProps = {
  closeness: number | null;
  trust: number | null;
  tension: number | null;
  secrecy: number | null;
  kinship: KinshipKind;
};

/**
 * 関係の自由記述（narrative）
 * @property summary - 関係全体の物語的記述
 * @property notes - メモ・補足
 * @property turningPoints - ターニングポイントのリスト（時刻と内容）
 *   - `at` は ISO 8601 形式の文字列（例: "2024-01-01T00:00:00.000Z"）または時点の説明文字列
 *   - `note` は出来事の説明文字列
 */
export type RelationshipNarrative = {
  summary: string | null;
  notes: string | null;
  turningPoints: Array<{ at: string; note: string }>;
};

/**
 * 人物間の関係を表す型（v9・プロパティグラフ方式）
 * 1本のエッジが関係の多面性を内包する。レイヤーの概念を廃止し、
 * タグ・定型数値・自由記述・方向非対称プロパティで多次元的に記述する。
 *
 * @property id - 一意な識別子（nanoidで生成）
 * @property sourcePersonId - 関係の起点となる人物のID
 * @property targetPersonId - 関係の終点となる人物のID
 * @property isDirected - true=有向（forward/reverse が意味を持つ）、false=無向（reverse は未使用）
 * @property symmetric - 方向対称なプロパティ（closeness/trust/tension/secrecy/kinship）
 * @property forward - source→target 視点のプロパティ
 * @property reverse - target→source 視点のプロパティ（isDirected=false の場合は未使用）
 * @property tags - 半定型タグ（色派生・フィルタの主軸）
 * @property narrative - 自由記述
 * @property colorOverride - エッジ色の手動上書き（null の場合はタグ/定型値から派生）
 * @property createdAt - 作成日時（ISO 8601形式の文字列）
 * @property updatedAt - 最終更新日時（ISO 8601形式の文字列）
 */
export type RelationshipV9 = {
  id: string;
  sourcePersonId: string;
  targetPersonId: string;
  isDirected: boolean;
  symmetric: SymmetricProps;
  forward: DirectionalProps;
  reverse: DirectionalProps;
  tags: string[];
  narrative: RelationshipNarrative;
  colorOverride: string | null;
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
 * エッジフィルタの述語
 * 定型数値・血縁の有無などによる絞り込み条件を表す
 */
export type EdgePredicate =
  | { type: 'closeness_gte'; value: number }
  | { type: 'trust_gte'; value: number }
  | { type: 'tension_gte'; value: number }
  | { type: 'secrecy_gte'; value: number }
  | { type: 'has_kinship' };

/**
 * エッジフィルタの状態
 * タグフィルタ（ANY/ALL モード）と述語フィルタの組み合わせで関係を絞り込む
 *
 * @property tags.mode - 'any': いずれかのタグが一致すればOK / 'all': 全タグが一致する必要あり
 * @property tags.values - フィルタ対象のタグ集合（空の場合はタグ絞り込みなし）
 * @property predicates - 追加述語フィルタ（全て通過する必要あり）
 */
export type EdgeFilter = {
  tags: {
    mode: 'any' | 'all';
    values: Set<string>;
  };
  predicates: EdgePredicate[];
};

/**
 * エッジフィルタの初期値（全エッジを表示）
 */
export const INITIAL_EDGE_FILTER: EdgeFilter = {
  tags: { mode: 'any', values: new Set() },
  predicates: [],
};

/**
 * タグと色のマッピング（旧レイヤー色を継承）
 * タグから色を派生させるために使用する
 */
export const TAG_COLOR_MAP: Record<string, string> = {
  // 旧 organizational レイヤー色を継承
  元同僚: '#22c55e',
  同級生: '#22c55e',
  上司: '#22c55e',
  部下: '#22c55e',
  師匠: '#22c55e',
  弟子: '#22c55e',
  // 旧 awareness レイヤー色を継承
  正体認知: '#8b5cf6',
  // 旧 emotional レイヤー色を継承
  片想い: '#ef4444',
  対立: '#ef4444',
};
