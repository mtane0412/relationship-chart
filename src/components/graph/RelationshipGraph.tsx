/**
 * RelationshipGraphコンポーネント
 * React Flowを使った相関図の表示コンテナ
 */

'use client';

import { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './PersonNode';
import { RelationshipEdge as RelationshipEdgeComponent } from './RelationshipEdge';
import { useForceLayout } from './useForceLayout';
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
  const forceEnabled = useGraphStore((state) => state.forceEnabled);

  // React Flowのノードとエッジの状態
  const [nodes, setNodes, onNodesChange] = useNodesState<PersonNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipEdge>([]);

  // ノード位置更新のコールバック（useForceLayout用）
  const handleNodesUpdate = useCallback(
    (updatedNodes: Node[]) => {
      setNodes(updatedNodes as PersonNodeType[]);
    },
    [setNodes]
  );

  // force-directedレイアウトの適用
  const { handleNodeDragStart, handleNodeDrag, handleNodeDragEnd } =
    useForceLayout({
      nodes,
      edges,
      enabled: forceEnabled,
      onNodesChange: handleNodesUpdate,
    });

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
        onNodeDragStart={(_, node) => handleNodeDragStart(node.id)}
        onNodeDrag={(_, node) =>
          handleNodeDrag(node.id, node.position)
        }
        onNodeDragStop={(_, node) => handleNodeDragEnd(node.id)}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
