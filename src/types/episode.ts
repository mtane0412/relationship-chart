/**
 * エピソード関連の型定義
 *
 * エピソードはプロパティグラフ上の第一級ノードとして扱う。
 * Person ノードと並んでキャンバスに表示され、
 * EpisodeParticipation エッジで参加者との関係を表現する。
 *
 * 設計方針:
 * - Episode はノードとしてグラフに組み込み、キャンバス上で可視化する
 * - Episode ↔ Person の参加関係は EpisodeParticipation エッジで表現する
 * - Relationship（Edge）への紐づけはID参照に留め、エッジtoエッジを避ける
 */

/**
 * エピソード
 *
 * 登場人物や関係にまつわる「時系列上の出来事」を表すグラフノード。
 *
 * @property id - 一意な識別子（nanoidで生成）
 * @property title - 必須のタイトル（例: "初めての出会い"）
 * @property description - 任意の複数行説明文
 * @property occurredAt - 任意のユーザー指定日時（自由文字列。例: "第3話", "2024年春"）
 * @property relatedRelationshipIds - 関連する関係のID参照配列（エッジtoエッジを避けプロパティとして保持）
 * @property position - キャンバス上の座標（Personノードと同様）
 * @property properties - 将来の拡張用カスタムプロパティ
 * @property createdAt - 作成日時（ISO 8601形式）
 * @property updatedAt - 最終更新日時（ISO 8601形式）
 */
export type Episode = {
  id: string;
  title: string;
  description?: string;
  occurredAt?: string;
  relatedRelationshipIds: string[];
  position?: { x: number; y: number };
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/**
 * Episode ↔ Person の参加エッジ
 *
 * 「このエピソードにこの人物が関わる」を表すグラフエッジ。
 * 向きを持たない軽量な注釈として扱い、キャンバスでは破線で可視化する。
 *
 * @property id - 一意な識別子（nanoidで生成）
 * @property episodeId - 参加するエピソードのID
 * @property personId - 参加する人物のID
 * @property role - 将来拡張用のロール（例: "主人公", "言及"）。初版では未使用
 * @property createdAt - 作成日時（ISO 8601形式）
 */
export type EpisodeParticipation = {
  id: string;
  episodeId: string;
  personId: string;
  role?: string;
  createdAt: string;
};
