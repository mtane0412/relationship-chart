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
    <div className="w-full h-screen relative">
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

      {/* 空状態UI */}
      {persons.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center border-2 border-gray-200">
            <div className="mb-4">
              <svg
                className="w-20 h-20 mx-auto text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              人物相関図を作成
            </h2>
            <p className="text-gray-600 mb-4">
              左側のパネルから人物を追加して、相関図を作成しましょう
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>📸 画像をドラッグ&ドロップして人物を追加</p>
              <p>🔗 2人以上登録すると関係を追加できます</p>
              <p>✨ 自動配置で見やすいレイアウトに整理</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
