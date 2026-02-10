/**
 * コンテキストメニューの状態管理フック
 *
 * ノード・エッジ・背景の右クリックに応じたコンテキストメニューの状態を管理します。
 * 画面端での位置補正も行います。
 */

import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

/**
 * コンテキストメニューの状態（判別共用体）
 */
export type ContextMenuState =
  | { type: 'node'; nodeId: string; position: { x: number; y: number } }
  | { type: 'edge'; edgeId: string; position: { x: number; y: number } }
  | {
      type: 'pane';
      position: { x: number; y: number };
      flowPosition: { x: number; y: number };
    }
  | {
      type: 'add-relationship';
      sourceNodeId: string;
      position: { x: number; y: number };
    }
  | null;

/**
 * メニューサイズの定数（位置補正用）
 */
const MENU_WIDTH = 200;
const MAX_MENU_HEIGHT = 400; // スクロール可能な最大高さ

/**
 * コンテキストメニューの状態管理フック
 *
 * @param screenToFlowPosition - スクリーン座標をフロー座標に変換する関数（依存注入）
 * @returns メニュー状態とハンドラ関数
 */
export function useContextMenu(
  screenToFlowPosition: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  }
) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  /**
   * 画面端での位置補正を行う
   *
   * @param x - 元のx座標
   * @param y - 元のy座標
   * @returns 補正後の座標
   */
  const adjustPosition = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      let adjustedX = x;
      let adjustedY = y;

      // 画面右端でメニューがはみ出す場合は左に補正
      if (adjustedX + MENU_WIDTH > window.innerWidth) {
        adjustedX = window.innerWidth - MENU_WIDTH;
      }

      // 画面下端でメニューがはみ出す場合は上に補正
      if (adjustedY + MAX_MENU_HEIGHT > window.innerHeight) {
        adjustedY = window.innerHeight - MAX_MENU_HEIGHT;
      }

      return { x: adjustedX, y: adjustedY };
    },
    []
  );

  /**
   * ノード右クリックハンドラ
   */
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const position = adjustPosition(event.clientX, event.clientY);
      setContextMenu({
        type: 'node',
        nodeId: node.id,
        position,
      });
    },
    [adjustPosition]
  );

  /**
   * エッジ右クリックハンドラ
   */
  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const position = adjustPosition(event.clientX, event.clientY);
      setContextMenu({
        type: 'edge',
        edgeId: edge.id,
        position,
      });
    },
    [adjustPosition]
  );

  /**
   * 背景右クリックハンドラ
   */
  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const position = adjustPosition(event.clientX, event.clientY);
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        type: 'pane',
        position,
        flowPosition,
      });
    },
    [adjustPosition, screenToFlowPosition]
  );

  /**
   * メニューを閉じる
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * 関係追加モードに切り替える
   */
  const switchToAddRelationshipMode = useCallback(
    (sourceNodeId: string, position: { x: number; y: number }) => {
      const adjustedPosition = adjustPosition(position.x, position.y);
      setContextMenu({
        type: 'add-relationship',
        sourceNodeId,
        position: adjustedPosition,
      });
    },
    [adjustPosition]
  );

  return {
    contextMenu,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    handlePaneContextMenu,
    closeContextMenu,
    switchToAddRelationshipMode,
  };
}
