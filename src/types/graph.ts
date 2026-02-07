/**
 * グラフ描画に関連する型定義
 * React Flowで使用するノードとエッジの型を定義
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type { RelationshipType } from '@/types/relationship';

/**
 * カスタムノードのデータ型
 * PersonNodeコンポーネントで使用される
 */
export type PersonNodeData = {
  name: string;
  imageDataUrl?: string;
};

/**
 * カスタムエッジのデータ型
 * RelationshipEdgeコンポーネントで使用される
 */
export type RelationshipEdgeData = {
  type: RelationshipType;
  sourceToTargetLabel: string;
  targetToSourceLabel: string | null;
};

/**
 * React Flowで使用する人物ノード型
 */
export type PersonNode = ReactFlowNode<PersonNodeData, 'person'>;

/**
 * React Flowで使用する関係エッジ型
 */
export type RelationshipEdge = ReactFlowEdge<RelationshipEdgeData>;
