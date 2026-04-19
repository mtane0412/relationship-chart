/**
 * タイムラインスナップショットの型定義
 *
 * ユーザーが任意のタイミングで保存したグラフ全体の状態（スナップショット）を表す。
 * スライダー再生機能で過去の状態を閲覧・アニメーション再生するために使用する。
 *
 * 設計方針:
 * - 完全スナップショット方式（差分ではなく各時点の全状態を保存）
 * - imageDataUrl を保持せず personId で参照することで画像重複を回避
 * - Chart.persons[] が参照元。削除済み Person はプレースホルダー表示する
 */

import type { RelationshipNarrative, RelationshipProperties } from './relationship';

/**
 * スナップショット時点の人物の軽量表現
 *
 * @property personId - Person.id への参照（画像取得時に使用）
 * @property name - スナップショット時点の名前（名前変更の変遷を追跡可能）
 * @property labels - スナップショット時点のラベル配列
 * @property position - スナップショット時点のキャンバス座標
 * @property properties - スナップショット時点のカスタムプロパティ
 */
export type SnapshotPerson = {
  personId: string;
  name: string;
  labels: string[];
  position?: { x: number; y: number };
  properties: Record<string, unknown>;
};

/**
 * スナップショット時点の関係の表現
 *
 * @property relationshipId - Relationship.id への参照
 * @property type - エッジ型ラベル
 * @property sourceId - 起点ノードID
 * @property targetId - 終点ノードID
 * @property label - 表示ラベル（null の場合は type を使用）
 * @property symmetric - true=無向表示、false=有向
 * @property tags - 分類タグ配列
 * @property colorOverride - エッジ色の手動上書き
 * @property properties - ドメイン属性 + カスタムプロパティ（数値変化のアニメーション追跡用）
 * @property narrative - 自由記述（タイムライン表示での欠落を防ぐため保存）
 */
export type SnapshotRelationship = {
  relationshipId: string;
  type: string;
  sourceId: string;
  targetId: string;
  label: string | null;
  symmetric: boolean;
  tags: string[];
  colorOverride: string | null;
  properties: RelationshipProperties;
  narrative: RelationshipNarrative;
};

/**
 * タイムラインスナップショット
 *
 * ユーザーが保存したある時点のグラフ全体の状態を表す。
 * Chart.snapshots[] として保存される。
 *
 * @property id - 一意な識別子（nanoidで生成）
 * @property label - ユーザーが付ける名前（例: "第1話", "2024年春"）
 * @property description - 任意の説明文
 * @property persons - スナップショット時点の人物リスト（imageDataUrl を除く軽量表現）
 * @property relationships - スナップショット時点の関係リスト
 * @property createdAt - 保存日時（ISO 8601形式）
 */
export type Snapshot = {
  id: string;
  label: string;
  description?: string;
  persons: SnapshotPerson[];
  relationships: SnapshotRelationship[];
  createdAt: string;
};
