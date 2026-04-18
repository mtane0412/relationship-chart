/**
 * グラフ描画に関連する型定義
 * React Flowで使用するノードとエッジの型を定義（v11 プロパティグラフ方式）
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type { EdgeVisual } from '@/lib/relationship-visual';

/**
 * カスタムノードのデータ型
 * GraphNodeComponentで使用される
 */
export type PersonNodeData = {
  name: string;
  imageDataUrl?: string;
  /** ノードに付与されたラベル配列（例: ['人物'], ['物']）*/
  labels: string[];
};

/**
 * カスタムエッジのデータ型（v11 プロパティグラフ方式）
 * RelationshipEdgeコンポーネントで使用される
 *
 * @property edgeType - エッジ型ラベル（例: "友人", "同僚"）
 * @property label - 表示ラベル（null の場合は edgeType を表示）
 * @property symmetric - true=無向表示（矢印なし）、false=有向（矢印あり）
 * @property visual - 色・線幅・破線・マーカーキーの導出済み視覚属性
 * @property edgeIndex - 同一ペア内でのエッジインデックス（並列描画オフセット計算用）
 * @property totalEdgesInPair - 同一ペア内のエッジ総数（並列描画オフセット計算用）
 */
export type RelationshipEdgeData = {
  /** エッジ型ラベル */
  edgeType: string;
  /** 表示ラベル（null の場合は edgeType を使用） */
  label: string | null;
  /** true=無向表示（矢印なし）、false=有向（矢印あり） */
  symmetric: boolean;
  /** 導出済みの視覚的属性 */
  visual: EdgeVisual;
  /** 同一ペア内でのエッジのインデックス（0始まり）。並列描画オフセットの計算に使用 */
  edgeIndex: number;
  /** 同一ペア内のエッジ総数。並列描画オフセットの計算に使用 */
  totalEdgesInPair: number;
};

/**
 * React Flowで使用するグラフノード型
 * ラベル配列でノードの種別を表現するプロパティグラフ方式
 */
export type GraphNode = ReactFlowNode<PersonNodeData, 'graph'>;

/**
 * React Flowで使用する関係エッジ型
 */
export type RelationshipEdge = ReactFlowEdge<RelationshipEdgeData>;
