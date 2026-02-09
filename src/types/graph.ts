/**
 * グラフ描画に関連する型定義
 * React Flowで使用するノードとエッジの型を定義
 */

import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type { RelationshipType } from '@/types/relationship';

import type { NodeKind } from '@/types/person';

/**
 * カスタムノードのデータ型
 * PersonNodeコンポーネントで使用される
 */
export type PersonNodeData = {
  name: string;
  imageDataUrl?: string;
  kind?: NodeKind;
};

/**
 * カスタムエッジのデータ型
 * RelationshipEdgeコンポーネントで使用される
 */
export type RelationshipEdgeData = {
  displayType: RelationshipType;
  sourceToTargetLabel: string | null;
  targetToSourceLabel: string | null;
};

/**
 * React Flowで使用する人物ノード型
 */
export type PersonNode = ReactFlowNode<PersonNodeData, 'person'>;

/**
 * React Flowで使用する物ノード型
 */
export type ItemNode = ReactFlowNode<PersonNodeData, 'item'>;

/**
 * React Flowで使用するグラフノード型（人物または物）
 */
export type GraphNode = PersonNode | ItemNode;

/**
 * React Flowで使用する関係エッジ型
 */
export type RelationshipEdge = ReactFlowEdge<RelationshipEdgeData>;
