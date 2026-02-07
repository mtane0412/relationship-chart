/**
 * RelationshipGraphコンポーネント
 * React Flowを使った相関図の表示コンテナ
 */

'use client';

import { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Connection,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './PersonNode';
import { RelationshipEdge as RelationshipEdgeComponent } from './RelationshipEdge';
import { PersonRegistrationModal } from './PersonRegistrationModal';
import { RelationshipRegistrationModal } from './RelationshipRegistrationModal';
import { useForceLayout } from './useForceLayout';
import { useGraphStore } from '@/stores/useGraphStore';
import { personsToNodes, relationshipsToEdges } from '@/lib/graph-utils';
import { processImage } from '@/lib/image-utils';
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
 * 画像D&D/ペースト時の登録待ちデータ
 */
type PendingRegistration = {
  imageDataUrl?: string;
  position: { x: number; y: number };
};

/**
 * エッジ接続時の登録待ちデータ
 */
type PendingConnection = {
  sourcePersonId: string;
  targetPersonId: string;
  /** 編集対象の既存関係ID（編集モードの場合） */
  existingRelationshipId?: string;
};

/**
 * 相関図グラフコンポーネント
 */
export function RelationshipGraph() {
  // Zustandストアから人物と関係を取得
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const forceEnabled = useGraphStore((state) => state.forceEnabled);
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const addPerson = useGraphStore((state) => state.addPerson);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const updateRelationship = useGraphStore((state) => state.updateRelationship);
  const removePerson = useGraphStore((state) => state.removePerson);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const setSelectedPersonIds = useGraphStore((state) => state.setSelectedPersonIds);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  // React Flowのノードとエッジの状態
  const [nodes, setNodes, onNodesChange] = useNodesState<PersonNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RelationshipEdge>([]);

  // 登録モーダルの状態
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  // React Flow APIを取得
  const { screenToFlowPosition } = useReactFlow();

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

    setNodes((prevNodes) => {
      // 既存ノードをid -> nodeのマップに変換して高速に参照する（O(n²) → O(n)）
      const prevNodeMap = new Map(prevNodes.map((node) => [node.id, node]));

      // 既存のノード位置を保持しながら更新（選択状態はストアから設定）
      const updatedNodes = newNodes.map((newNode) => {
        const existingNode = prevNodeMap.get(newNode.id);
        if (existingNode) {
          // 既存ノードが存在する場合は位置を保持し、選択状態はストアから設定
          return {
            ...newNode,
            position: existingNode.position,
            selected: selectedPersonIds.includes(newNode.id),
          };
        }
        // 新規ノードの場合はランダムな位置に配置
        return {
          ...newNode,
          position: {
            x: Math.random() * 500 + 100,
            y: Math.random() * 500 + 100,
          },
          selected: selectedPersonIds.includes(newNode.id),
        };
      });
      return updatedNodes;
    });

    setEdges(newEdges);
  }, [persons, relationships, selectedPersonIds, setNodes, setEdges]);

  // キャンバスへの画像ドロップハンドラ
  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // ドロップされたファイルを取得
      const files = Array.from(event.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (!imageFile) return;

      try {
        // 画像をリサイズ
        const imageDataUrl = await processImage(imageFile);

        // ドロップ位置をReact Flowの座標系に変換
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // モーダルを開く
        setPendingRegistration({ imageDataUrl, position });
      } catch (error) {
        console.error('画像処理に失敗しました:', error);
      }
    },
    [screenToFlowPosition]
  );

  // ドラッグオーバーハンドラ（ドロップを許可するために必要）
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // クリップボードからのペーストハンドラ
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      // クリップボードから画像を検出
      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith('image/')
      );

      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      try {
        // 画像をリサイズ
        const imageDataUrl = await processImage(file);

        // キャンバス中央の座標を計算（screenToFlowPositionはここでは使えないので概算）
        const position = { x: 400, y: 300 };

        // モーダルを開く
        setPendingRegistration({ imageDataUrl, position });
      } catch (error) {
        console.error('画像処理に失敗しました:', error);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Undo/Redoキーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // モーダルが開いている時はスキップ（モーダル内のinputでテキストundoを優先）
      if (pendingRegistration !== null || pendingConnection !== null) {
        return;
      }

      // input/textarea/contentEditable内ではスキップ（ブラウザ標準のテキストundoを優先）
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = event.key.toLowerCase();

      // Cmd+Z (macOS) / Ctrl+Z (Windows): Undo
      if ((event.metaKey || event.ctrlKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        useGraphStore.temporal.getState().undo();
        return;
      }

      // Cmd+Shift+Z (macOS) / Ctrl+Shift+Z (Windows): Redo
      if ((event.metaKey || event.ctrlKey) && key === 'z' && event.shiftKey) {
        event.preventDefault();
        useGraphStore.temporal.getState().redo();
        return;
      }

      // Ctrl+Y (Windows標準のRedo): Redo
      if (event.ctrlKey && key === 'y' && !event.shiftKey && !event.metaKey) {
        event.preventDefault();
        useGraphStore.temporal.getState().redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingRegistration, pendingConnection]);

  // 選択変更ハンドラ（React Flowの選択状態をストアに同期）
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      // 選択されたノードのIDを抽出
      const selectedNodeIds = params.nodes.map((node) => node.id);
      setSelectedPersonIds(selectedNodeIds);
    },
    [setSelectedPersonIds]
  );

  // 背景クリックハンドラ
  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // エッジ接続ハンドラ
  const handleConnect = useCallback(
    (connection: Connection) => {
      // sourceとtargetが存在し、異なることを確認（自己接続を防止）
      if (connection.source && connection.target && connection.source !== connection.target) {
        // 両方の人物が実際に存在することを確認
        const sourcePerson = persons.find((p) => p.id === connection.source);
        const targetPerson = persons.find((p) => p.id === connection.target);

        if (sourcePerson && targetPerson) {
          // 同じペアの関係が既に存在するかチェック（方向問わず）
          const existingRelationship = relationships.find(
            (r) =>
              (r.sourcePersonId === connection.source && r.targetPersonId === connection.target) ||
              (r.sourcePersonId === connection.target && r.targetPersonId === connection.source)
          );

          if (existingRelationship) {
            // 既に関係が存在する場合は編集モーダルを開く
            setPendingConnection({
              sourcePersonId: connection.source,
              targetPersonId: connection.target,
              existingRelationshipId: existingRelationship.id,
            });
            return;
          }

          setPendingConnection({
            sourcePersonId: connection.source,
            targetPersonId: connection.target,
          });
        }
      }
    },
    [persons, relationships]
  );

  // ノード削除ハンドラ（確認ダイアログ付き）
  const handleNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      if (nodesToDelete.length === 0) return;

      const count = nodesToDelete.length;
      const firstNode = nodesToDelete[0] as PersonNodeType;
      const message =
        count === 1
          ? `「${firstNode.data?.name || '不明な人物'}」を削除してもよろしいですか？`
          : `${count}個の人物を削除してもよろしいですか？`;

      if (confirm(message)) {
        nodesToDelete.forEach((node) => removePerson(node.id));
      }
    },
    [removePerson]
  );

  // エッジ削除ハンドラ（確認ダイアログ付き）
  const handleEdgesDelete = useCallback(
    (edgesToDelete: RelationshipEdge[]) => {
      if (edgesToDelete.length === 0) return;

      const count = edgesToDelete.length;
      const firstEdge = edgesToDelete[0];
      const message =
        count === 1 && firstEdge
          ? `「${firstEdge.data?.sourceToTargetLabel || '不明な関係'}」を削除してもよろしいですか？`
          : `${count}個の関係を削除してもよろしいですか？`;

      if (confirm(message)) {
        edgesToDelete.forEach((edge) => removeRelationship(edge.id));
      }
    },
    [removeRelationship]
  );

  // モーダルからの登録ハンドラ
  const handleRegisterPerson = useCallback(
    (name: string) => {
      if (!pendingRegistration) return;

      // 人物を追加
      addPerson({
        name,
        imageDataUrl: pendingRegistration.imageDataUrl,
      });

      // モーダルを閉じる
      setPendingRegistration(null);
    },
    [pendingRegistration, addPerson]
  );

  // モーダルのキャンセルハンドラ（人物登録）
  const handleCancelRegistration = useCallback(() => {
    setPendingRegistration(null);
  }, []);

  // 関係登録・更新ハンドラ
  const handleRegisterRelationship = useCallback(
    (
      type: import('@/types/relationship').RelationshipType,
      sourceToTargetLabel: string,
      targetToSourceLabel: string | null
    ) => {
      if (!pendingConnection) return;

      if (pendingConnection.existingRelationshipId) {
        // 編集モード: 既存の関係を更新
        updateRelationship(pendingConnection.existingRelationshipId, {
          type,
          sourceToTargetLabel,
          targetToSourceLabel,
        });
      } else {
        // 新規登録モード: 関係を追加
        addRelationship({
          sourcePersonId: pendingConnection.sourcePersonId,
          targetPersonId: pendingConnection.targetPersonId,
          type,
          sourceToTargetLabel,
          targetToSourceLabel,
        });
      }

      // モーダルを閉じる
      setPendingConnection(null);
    },
    [pendingConnection, addRelationship, updateRelationship]
  );

  // 関係登録のキャンセルハンドラ
  const handleCancelRelationship = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // pendingConnectionの人物が削除された場合はキャンセル
  useEffect(() => {
    if (pendingConnection) {
      const sourcePerson = persons.find((p) => p.id === pendingConnection.sourcePersonId);
      const targetPerson = persons.find((p) => p.id === pendingConnection.targetPersonId);

      if (!sourcePerson || !targetPerson) {
        // どちらかの人物が削除された場合はモーダルをキャンセル
        setPendingConnection(null);
      }
    }
  }, [pendingConnection, persons]);


  return (
    <div className="w-full h-screen relative" onDrop={handleDrop} onDragOver={handleDragOver}>
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
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        onConnect={handleConnect}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
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
              画像をキャンバスにドラッグ&ドロップまたはペーストして人物を追加しましょう
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>📸 画像をD&D/ペーストして人物を追加</p>
              <p>🔗 2人以上登録すると関係を追加できます</p>
              <p>✨ 自動配置で見やすいレイアウトに整理</p>
            </div>
          </div>
        </div>
      )}

      {/* 人物登録モーダル */}
      <PersonRegistrationModal
        isOpen={pendingRegistration !== null}
        imageDataUrl={pendingRegistration?.imageDataUrl}
        onSubmit={handleRegisterPerson}
        onCancel={handleCancelRegistration}
      />

      {/* 関係登録モーダル */}
      <RelationshipRegistrationModal
        isOpen={pendingConnection !== null}
        sourcePerson={(() => {
          if (!pendingConnection) return { name: '' };
          const sourcePerson = persons.find((p) => p.id === pendingConnection.sourcePersonId);
          return {
            name: sourcePerson?.name || '不明な人物',
            imageDataUrl: sourcePerson?.imageDataUrl,
          };
        })()}
        targetPerson={(() => {
          if (!pendingConnection) return { name: '' };
          const targetPerson = persons.find((p) => p.id === pendingConnection.targetPersonId);
          return {
            name: targetPerson?.name || '不明な人物',
            imageDataUrl: targetPerson?.imageDataUrl,
          };
        })()}
        defaultType="one-way"
        initialRelationship={(() => {
          if (!pendingConnection?.existingRelationshipId) return undefined;
          const existingRelationship = relationships.find(
            (r) => r.id === pendingConnection.existingRelationshipId
          );
          if (!existingRelationship) return undefined;
          return {
            type: existingRelationship.type,
            sourceToTargetLabel: existingRelationship.sourceToTargetLabel,
            targetToSourceLabel: existingRelationship.targetToSourceLabel,
          };
        })()}
        onSubmit={handleRegisterRelationship}
        onCancel={handleCancelRelationship}
      />
    </div>
  );
}
