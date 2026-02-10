/**
 * useContextMenuフックのテスト
 *
 * コンテキストメニューの状態管理と位置計算が正しく動作することを検証します。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContextMenu } from './useContextMenu';
import type { Node, Edge } from '@xyflow/react';

describe('useContextMenu', () => {
  // モック関数: screenToFlowPosition
  const mockScreenToFlowPosition = vi.fn((position: { x: number; y: number }) => ({
    x: position.x + 100,
    y: position.y + 100,
  }));

  // window.innerWidthとinnerHeightのモック
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
    mockScreenToFlowPosition.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('初期状態はnullである', () => {
    const { result } = renderHook(() =>
      useContextMenu(mockScreenToFlowPosition)
    );

    expect(result.current.contextMenu).toBeNull();
  });

  describe('handleNodeContextMenu', () => {
    it('ノード右クリック時にnode型のメニュー状態を設定する', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      } as unknown as React.MouseEvent;

      const mockNode: Node = {
        id: 'node-1',
        position: { x: 0, y: 0 },
        data: {},
      };

      act(() => {
        result.current.handleNodeContextMenu(mockEvent, mockNode);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.contextMenu).toEqual({
        type: 'node',
        nodeId: 'node-1',
        position: { x: 100, y: 200 },
      });
    });

    it('画面右端でメニューがはみ出す場合は左に補正する', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 900, // 1024 - 200 = 824を超える
        clientY: 100,
      } as unknown as React.MouseEvent;

      const mockNode: Node = {
        id: 'node-1',
        position: { x: 0, y: 0 },
        data: {},
      };

      act(() => {
        result.current.handleNodeContextMenu(mockEvent, mockNode);
      });

      // x座標が補正される（1024 - 200 = 824）
      expect(result.current.contextMenu).toEqual({
        type: 'node',
        nodeId: 'node-1',
        position: { x: 824, y: 100 },
      });
    });

    it('画面下端でメニューがはみ出す場合は上に補正する', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 700, // 768 - 200 = 568を超える
      } as unknown as React.MouseEvent;

      const mockNode: Node = {
        id: 'node-1',
        position: { x: 0, y: 0 },
        data: {},
      };

      act(() => {
        result.current.handleNodeContextMenu(mockEvent, mockNode);
      });

      // y座標が補正される（768 - 400 = 368）
      expect(result.current.contextMenu).toEqual({
        type: 'node',
        nodeId: 'node-1',
        position: { x: 100, y: 368 },
      });
    });
  });

  describe('handleEdgeContextMenu', () => {
    it('エッジ右クリック時にedge型のメニュー状態を設定する', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 150,
        clientY: 250,
      } as unknown as React.MouseEvent;

      const mockEdge: Edge = {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
      };

      act(() => {
        result.current.handleEdgeContextMenu(mockEvent, mockEdge);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result.current.contextMenu).toEqual({
        type: 'edge',
        edgeId: 'edge-1',
        position: { x: 150, y: 250 },
      });
    });
  });

  describe('handlePaneContextMenu', () => {
    it('背景右クリック時にpane型のメニュー状態を設定する', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 200,
        clientY: 300,
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.handlePaneContextMenu(mockEvent);
      });

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockScreenToFlowPosition).toHaveBeenCalledWith({ x: 200, y: 300 });
      expect(result.current.contextMenu).toEqual({
        type: 'pane',
        position: { x: 200, y: 300 },
        flowPosition: { x: 300, y: 400 }, // モックの返り値
      });
    });
  });

  describe('closeContextMenu', () => {
    it('メニュー状態をnullにリセットする', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      // まずメニューを開く
      const mockEvent = {
        preventDefault: vi.fn(),
        clientX: 100,
        clientY: 200,
      } as unknown as React.MouseEvent;

      const mockNode: Node = {
        id: 'node-1',
        position: { x: 0, y: 0 },
        data: {},
      };

      act(() => {
        result.current.handleNodeContextMenu(mockEvent, mockNode);
      });

      expect(result.current.contextMenu).not.toBeNull();

      // メニューを閉じる
      act(() => {
        result.current.closeContextMenu();
      });

      expect(result.current.contextMenu).toBeNull();
    });
  });

  describe('switchToAddRelationshipMode', () => {
    it('関係追加モードに切り替える', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      const sourceNodeId = 'node-1';
      const position = { x: 150, y: 250 };

      act(() => {
        result.current.switchToAddRelationshipMode(sourceNodeId, position);
      });

      expect(result.current.contextMenu).toEqual({
        type: 'add-relationship',
        sourceNodeId,
        position,
      });
    });

    it('関係追加モードでも位置補正が適用される', () => {
      const { result } = renderHook(() =>
        useContextMenu(mockScreenToFlowPosition)
      );

      const sourceNodeId = 'node-1';
      const position = { x: 900, y: 700 };

      act(() => {
        result.current.switchToAddRelationshipMode(sourceNodeId, position);
      });

      // 位置が補正される（768 - 400 = 368）
      expect(result.current.contextMenu).toEqual({
        type: 'add-relationship',
        sourceNodeId,
        position: { x: 824, y: 368 }, // 補正後の位置
      });
    });
  });
});
