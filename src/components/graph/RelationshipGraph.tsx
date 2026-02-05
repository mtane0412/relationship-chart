/**
 * RelationshipGraphコンポーネント
 * React Flowを使った相関図の表示コンテナ
 */

'use client';

import { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './PersonNode';
import { RelationshipEdge as RelationshipEdgeComponent } from './RelationshipEdge';
import { useGraphStore } from '@/stores/useGraphStore';
import { personsToNodes, relationshipsToEdges } from '@/lib/graph-utils';
import type {
  PersonNode as PersonNodeType,
  RelationshipEdge,
} from '@/types/graph';

// カスタムノードタイプの定義
const nodeTypes: NodeTypes = {
  person: PersonNode,
};

// カスタムエッジタイプの定義
const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdgeComponent,
};

/**
 * 相関図グラフコンポーネント
 */
export function RelationshipGraph() {
  // Zustandストアから人物と関係を取得
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);

  // React Flowのノードとエッジの状態
  const [nodes, setNodes, onNodesChange] = useNodesState<PersonNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipEdge>([]);

  // ストアのデータが変更されたらノードとエッジを更新
  useEffect(() => {
    const newNodes = personsToNodes(persons);
    const newEdges = relationshipsToEdges(relationships);

    // 既存のノード位置を保持しながら更新
    const updatedNodes = newNodes.map((newNode) => {
      const existingNode = nodes.find((n) => n.id === newNode.id);
      if (existingNode) {
        // 既存ノードが存在する場合は位置を保持
        return {
          ...newNode,
          position: existingNode.position,
        };
      }
      // 新規ノードの場合はランダムな位置に配置
      return {
        ...newNode,
        position: {
          x: Math.random() * 500 + 100,
          y: Math.random() * 500 + 100,
        },
      };
    });

    setNodes(updatedNodes);
    setEdges(newEdges);
  }, [persons, relationships, setNodes, setEdges]);

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
