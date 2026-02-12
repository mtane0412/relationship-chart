/**
 * useGraphInteractionsカスタムフックのテスト
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGraphInteractions } from './useGraphInteractions';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Connection } from '@xyflow/react';

// React Flowのモック
vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({
    screenToFlowPosition: vi.fn((pos) => pos),
    getNodes: vi.fn(() => []),
  }),
}));

describe('useGraphInteractions', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useGraphStore.setState({
      persons: [],
      relationships: [],
      selectedPersonIds: [],
      forceEnabled: false,
    });
  });

  describe('handleConnect', () => {
    it('connectingFromNodeIdRefをsourceとして使用し、source/targetの入れ替わりに対応する', () => {
      // 事前条件: 2人の人物を登録
      const personA = {
        id: 'person-a',
        name: '山田太郎',
        createdAt: new Date().toISOString(),
        kind: 'person' as const,
      };
      const personB = {
        id: 'person-b',
        name: '佐藤花子',
        createdAt: new Date().toISOString(),
        kind: 'person' as const,
      };
      useGraphStore.setState({
        persons: [personA, personB],
      });

      // フックをレンダリング
      const { result } = renderHook(() =>
        useGraphInteractions({
          contextMenu: null,
          closeContextMenu: vi.fn(),
        })
      );

      // ステップ1: handleConnectStartでドラッグ開始ノード（person-a）を記録
      act(() => {
        result.current.handleConnectStart(new MouseEvent('mousedown'), {
          nodeId: 'person-a',
          handleId: 'source',
        });
      });

      // ステップ2: handleConnectを呼び出す
      // React FlowがConnectionMode.Looseでsource/targetを入れ替えたケースをシミュレート
      const connection: Connection = {
        source: 'person-b', // React Flowが勝手に入れ替えた値
        target: 'person-a', // React Flowが勝手に入れ替えた値
        sourceHandle: null,
        targetHandle: null,
      };

      act(() => {
        result.current.handleConnect(connection);
      });

      // 検証: pendingConnectionがドラッグ開始ノード（person-a）をsourceとして設定されているか
      expect(result.current.pendingConnection).not.toBeNull();
      expect(result.current.pendingConnection?.sourcePersonId).toBe('person-a');
      expect(result.current.pendingConnection?.targetPersonId).toBe('person-b');
    });

    it('connectingFromNodeIdRefがnullの場合はconnection.source/targetをそのまま使用する', () => {
      // 事前条件: 2人の人物を登録
      const personA = {
        id: 'person-a',
        name: '山田太郎',
        createdAt: new Date().toISOString(),
        kind: 'person' as const,
      };
      const personB = {
        id: 'person-b',
        name: '佐藤花子',
        createdAt: new Date().toISOString(),
        kind: 'person' as const,
      };
      useGraphStore.setState({
        persons: [personA, personB],
      });

      // フックをレンダリング
      const { result } = renderHook(() =>
        useGraphInteractions({
          contextMenu: null,
          closeContextMenu: vi.fn(),
        })
      );

      // handleConnectStartを呼ばずに直接handleConnectを呼び出す
      // （connectingFromNodeIdRefがnullの状態）
      const connection: Connection = {
        source: 'person-a',
        target: 'person-b',
        sourceHandle: null,
        targetHandle: null,
      };

      act(() => {
        result.current.handleConnect(connection);
      });

      // 検証: connection.source/targetがそのまま使用される
      expect(result.current.pendingConnection).not.toBeNull();
      expect(result.current.pendingConnection?.sourcePersonId).toBe('person-a');
      expect(result.current.pendingConnection?.targetPersonId).toBe('person-b');
    });
  });
});
