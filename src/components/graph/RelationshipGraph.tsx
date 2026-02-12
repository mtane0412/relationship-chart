/**
 * RelationshipGraphコンポーネント
 * React Flowを使った相関図の表示コンテナ
 */

'use client';

import { useMemo, useRef, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ConnectionMode,
  ConnectionLineType,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './PersonNode';
import { ItemNode } from './ItemNode';
import { RelationshipEdge as RelationshipEdgeComponent } from './RelationshipEdge';
import { ConnectionLine } from './ConnectionLine';
import { ForceLayoutPanel } from './ForceLayoutPanel';
import ShareButton from './ShareButton';
import SearchBar from './SearchBar';
import { PersonRegistrationModal } from './PersonRegistrationModal';
import { RelationshipRegistrationModal } from './RelationshipRegistrationModal';
import { useForceLayout } from './useForceLayout';
import { useGraphDataSync } from './useGraphDataSync';
import { useGraphInteractions } from './useGraphInteractions';
import { useGraphContextMenuActions } from './useGraphContextMenuActions';
import { useContextMenu } from './useContextMenu';
import { ContextMenu } from './ContextMenu';
import { useGraphStore } from '@/stores/useGraphStore';
import { getRelationshipDisplayType } from '@/lib/relationship-utils';
import { resolveCollisions, DEFAULT_COLLISION_OPTIONS } from '@/lib/collision-resolver';
import { syncNodePositionsToStore } from '@/lib/graph-utils';
import type { GraphNode } from '@/types/graph';

// カスタムノードタイプの定義
const nodeTypes: NodeTypes = {
  person: PersonNode,
  item: ItemNode,
};

// カスタムエッジタイプの定義
const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdgeComponent,
};

/**
 * 相関図グラフコンポーネント
 */
export function RelationshipGraph() {
  // Zustandストアから必要な状態を取得
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const forceParams = useGraphStore((state) => state.forceParams);
  const updatePersonPositions = useGraphStore((state) => state.updatePersonPositions);

  // React Flow APIを取得
  const { screenToFlowPosition, getNodes } = useReactFlow();

  // グラフデータ同期（ストアデータ→ノード/エッジ変換、選択状態同期）
  const {
    nodes,
    edges,
    setNodes,
    onNodesChange,
    onEdgesChange,
    handleNodesUpdate,
    forceEnabled,
  } = useGraphDataSync();

  // コンテキストメニューの状態管理
  const {
    contextMenu,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    handlePaneContextMenu,
    closeContextMenu,
    switchToAddRelationshipMode,
  } = useContextMenu(screenToFlowPosition);

  // インタラクション処理（D&D/ペースト/接続/削除/選択）
  const {
    pendingRegistration,
    pendingConnection,
    setPendingConnection,
    setPendingRegistration,
    handleDrop,
    handleDragOver,
    handleSelectionChange,
    handleNodeClick,
    handlePaneClick,
    handleEdgeClick,
    handleConnectStart,
    handleConnect,
    handleConnectEnd,
    handleBeforeDelete,
    handleNodesDelete,
    handleEdgesDelete,
    handleRegisterPerson,
    handleCancelRegistration,
    handleRegisterRelationship,
    handleCancelRelationship,
  } = useGraphInteractions({
    contextMenu,
    closeContextMenu,
  });

  // コンテキストメニュー項目の構築
  const contextMenuItems = useGraphContextMenuActions({
    contextMenu,
    edges,
    setPendingConnection,
    setPendingRegistration,
    closeContextMenu,
    switchToAddRelationshipMode,
    handleNodeContextMenu,
  });

  // getNodesをrefに退避（onNodeDragStopHandlerの依存配列から除外するため）
  const getNodesRef = useRef(getNodes);
  getNodesRef.current = getNodes;

  // force-directedレイアウトの適用
  const { handleNodeDragStart, handleNodeDrag, handleNodeDragEnd } =
    useForceLayout({
      nodes,
      edges,
      enabled: forceEnabled,
      onNodesChange: handleNodesUpdate,
      forceParams,
    });


  // ノードドラッグ開始ハンドラ
  const onNodeDragStartHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      handleNodeDragStart(node.id);
    },
    [handleNodeDragStart]
  );

  // ノードドラッグ中ハンドラ
  const onNodeDragHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      handleNodeDrag(node.id, node.position);
    },
    [handleNodeDrag]
  );

  // ノードドラッグ終了ハンドラ
  const onNodeDragStopHandler = useCallback(
    (_: React.MouseEvent, node: Node) => {
      handleNodeDragEnd(node.id);
      // Force Layout無効時は幾何学的衝突解消を適用
      if (!forceEnabled) {
        const currentNodes = getNodesRef.current();
        const resolvedNodes = resolveCollisions(currentNodes, DEFAULT_COLLISION_OPTIONS);
        // 位置が変更されたノードがあれば更新
        if (resolvedNodes !== currentNodes) {
          setNodes(resolvedNodes as GraphNode[]);
        }
        // 衝突解消後の位置をストアに書き戻す
        syncNodePositionsToStore(resolvedNodes as GraphNode[], updatePersonPositions);
      } else {
        // Force Layout有効時はドラッグノード単体の位置を書き戻す
        const currentNodes = getNodesRef.current();
        syncNodePositionsToStore(currentNodes as GraphNode[], updatePersonPositions);
      }
    },
    [handleNodeDragEnd, forceEnabled, setNodes, updatePersonPositions]
  );

  // Force Layout無効化時の位置書き戻し
  const prevForceEnabledRef = useRef(forceEnabled);
  useEffect(() => {
    // forceEnabledがtrue→falseに変わった時
    if (prevForceEnabledRef.current && !forceEnabled) {
      const currentNodes = getNodesRef.current();
      syncNodePositionsToStore(currentNodes as GraphNode[], updatePersonPositions);
    }
    prevForceEnabledRef.current = forceEnabled;
  }, [forceEnabled, updatePersonPositions]);

  return (
    <div className="w-full h-screen relative" onDrop={handleDrop} onDragOver={handleDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Straight}
        connectionLineComponent={ConnectionLine}
        connectionRadius={60}
        onNodeDragStart={onNodeDragStartHandler}
        onNodeDrag={onNodeDragHandler}
        onNodeDragStop={onNodeDragStopHandler}
        onNodeClick={handleNodeClick}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        onEdgeClick={handleEdgeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onMoveStart={closeContextMenu}
        onConnectStart={handleConnectStart}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onBeforeDelete={handleBeforeDelete}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
        <ForceLayoutPanel />
        <ShareButton />
        <SearchBar />

        {/* SVGマーカー定義（全エッジで共有） */}
        <svg>
          <defs>
            {/* 統一された矢印マーカー（グレー） */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
            </marker>
            {/* 選択時の矢印マーカー（青） */}
            <marker
              id="arrow-selected"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>

      {/* 空状態UI: +ボタン（ノードが0個の時のみ表示） */}
      {persons.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={() => {
              // 現在のビューポート中央（画面座標）を求めてからFlow座標に変換する
              const reactFlowElement = document.querySelector('.react-flow') as HTMLElement | null;
              let position: { x: number; y: number };

              if (reactFlowElement && typeof reactFlowElement.getBoundingClientRect === 'function') {
                const rect = reactFlowElement.getBoundingClientRect();
                const centerScreenPos = {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                };
                position = screenToFlowPosition(centerScreenPos);
              } else {
                // フォールバック: ウィンドウ中央を使用
                const fallbackCenter = {
                  x: window.innerWidth / 2,
                  y: window.innerHeight / 2,
                };
                position = screenToFlowPosition(fallbackCenter);
              }

              setPendingRegistration({ position });
            }}
            className="pointer-events-auto w-20 h-20 rounded-full bg-white border-2 border-gray-300 text-gray-700 text-5xl flex items-center justify-center shadow-md hover:bg-gray-50 hover:border-gray-400 transition-colors leading-none pb-1"
            aria-label="ノードを追加"
          >
            +
          </button>
        </div>
      )}

      {/* 人物登録モーダル */}
      <PersonRegistrationModal
        isOpen={pendingRegistration !== null}
        rawImageSrc={pendingRegistration?.rawImageSrc}
        onSubmit={handleRegisterPerson}
        onCancel={handleCancelRegistration}
      />

      {/* 関係登録モーダル */}
      <RelationshipRegistrationModal
        isOpen={pendingConnection !== null}
        sourcePerson={useMemo(() => {
          if (!pendingConnection) return { name: '' };
          const sourcePerson = persons.find((p) => p.id === pendingConnection.sourcePersonId);
          return {
            name: sourcePerson?.name || '不明な人物',
            imageDataUrl: sourcePerson?.imageDataUrl,
          };
        }, [pendingConnection, persons])}
        targetPerson={useMemo(() => {
          if (!pendingConnection) return { name: '' };
          const targetPerson = persons.find((p) => p.id === pendingConnection.targetPersonId);
          return {
            name: targetPerson?.name || '不明な人物',
            imageDataUrl: targetPerson?.imageDataUrl,
          };
        }, [pendingConnection, persons])}
        defaultType="one-way"
        initialRelationship={useMemo(() => {
          if (!pendingConnection?.existingRelationshipId) return undefined;
          const existingRelationship = relationships.find(
            (r) => r.id === pendingConnection.existingRelationshipId
          );
          if (!existingRelationship) return undefined;
          // 新データモデルからUI用のRelationshipTypeに変換
          const displayType = getRelationshipDisplayType(existingRelationship);
          return {
            type: displayType,
            sourceToTargetLabel: existingRelationship.sourceToTargetLabel ?? '',
            targetToSourceLabel: existingRelationship.targetToSourceLabel ?? null,
          };
        }, [pendingConnection, relationships])}
        onSubmit={handleRegisterRelationship}
        onCancel={handleCancelRelationship}
      />

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          items={contextMenuItems}
          position={contextMenu.position}
          onClose={closeContextMenu}
          filterPlaceholder={
            contextMenu.type === 'add-relationship'
              ? '名前で絞り込み...'
              : undefined
          }
        />
      )}
    </div>
  );
}
