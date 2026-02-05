/**
 * RelationshipGraphコンポーネント
 * React Flowを使った相関図の表示コンテナ
 */

'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './PersonNode';
import type { PersonNode as PersonNodeType, RelationshipEdge } from '@/types/graph';

// カスタムノードタイプの定義
const nodeTypes: NodeTypes = {
  person: PersonNode,
};

// ダミーデータ
const initialNodes: PersonNodeType[] = [
  {
    id: '1',
    type: 'person',
    data: { name: '山田太郎', imageDataUrl: '' },
    position: { x: 250, y: 0 },
  },
  {
    id: '2',
    type: 'person',
    data: { name: '佐藤花子', imageDataUrl: '' },
    position: { x: 100, y: 150 },
  },
  {
    id: '3',
    type: 'person',
    data: { name: '鈴木一郎', imageDataUrl: '' },
    position: { x: 400, y: 150 },
  },
];

const initialEdges: RelationshipEdge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    data: { label: '友人', isDirected: false },
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    data: { label: '同僚', isDirected: false },
  },
];

/**
 * 相関図グラフコンポーネント
 */
export function RelationshipGraph() {
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // ノード変更の処理（現在はダミー）
      applyNodeChanges(changes, initialNodes);
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      // エッジ変更の処理（現在はダミー）
      applyEdgeChanges(changes, initialEdges);
    },
    []
  );

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
