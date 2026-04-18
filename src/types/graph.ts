/**
 * グラフ描画に関連する型定義
 * React Flowで使用するノードとエッジの型を定義
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type { RelationshipType } from '@/types/relationship';
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
 * カスタムエッジのデータ型（v9 プロパティグラフ方式）
 * RelationshipEdgeコンポーネントで使用される
 *
 * @property displayType - エッジの表示タイプ（矢印・ラベル配置の制御）
 * @property forwardLabel - source→target 視点のラベル（forward.label 相当）
 * @property reverseLabel - target→source 視点のラベル（reverse.label 相当）
 * @property visual - 色・線幅・破線・マーカーキーの導出済み視覚属性
 * @property edgeIndex - 同一ペア内でのエッジインデックス（並列描画オフセット計算用）
 * @property totalEdgesInPair - 同一ペア内のエッジ総数（並列描画オフセット計算用）
 */
export type RelationshipEdgeData = {
  displayType: RelationshipType;
  /** source→target 方向のラベル（v9 forward.label） */
  forwardLabel: string | null;
  /** target→source 方向のラベル（v9 reverse.label） */
  reverseLabel: string | null;
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
