/**
 * useHandleHoverフックのテスト
 *
 * ノードのエッジ接続ハンドルのホバー状態管理をテストする
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Node } from '@xyflow/react';
import { useHandleHover } from './useHandleHover';

// useConnection のモック
vi.mock('@xyflow/react', () => ({
  useConnection: vi.fn(),
}));

import { useConnection } from '@xyflow/react';

describe('useHandleHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('基本的なホバー状態管理', () => {
    it('初期状態ではisHoveredがfalseであること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      expect(result.current.isHovered).toBe(false);
      expect(result.current.isConnectingToThisNode).toBe(false);
    });

    it('選択状態のノードではshowSourceHandleが常にtrueになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', true));

      // 選択状態の場合、ホバーしていなくてもshowSourceHandleがtrueになる
      expect(result.current.showSourceHandle).toBe(true);
    });

    it('onMouseEnterを呼ぶとisHoveredがtrueになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      act(() => {
        result.current.handleMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);
    });

    it('onMouseLeaveを呼ぶと200ms後にisHoveredがfalseになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      // ホバー開始
      act(() => {
        result.current.handleMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);

      // ホバー終了
      act(() => {
        result.current.handleMouseLeave();
      });

      // 即座にはfalseにならない
      expect(result.current.isHovered).toBe(true);

      // 200ms経過後にfalseになる
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isHovered).toBe(false);
    });

    it('ホバー終了後、遅延内に再ホバーするとtrueのままであること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      // ホバー開始
      act(() => {
        result.current.handleMouseEnter();
      });

      expect(result.current.isHovered).toBe(true);

      // ホバー終了
      act(() => {
        result.current.handleMouseLeave();
      });

      // 100ms経過（200ms未満）
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // 再ホバー
      act(() => {
        result.current.handleMouseEnter();
      });

      // trueのまま
      expect(result.current.isHovered).toBe(true);

      // さらに200ms経過してもtrueのまま（タイマーがクリアされているため）
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isHovered).toBe(true);
    });
  });

  describe('接続状態との連携', () => {
    it('接続中でfromNodeが自ノードの場合、showSourceHandleがfalseになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: true,
        fromHandle: { type: 'source', nodeId: 'test-node-id', id: 'handle-1' },
        toHandle: null,
        fromNode: { id: 'test-node-id' } as Node,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      expect(result.current.showSourceHandle).toBe(false);
    });

    it('接続中でtoNodeが自ノードの場合、showTargetHandleがfalseになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: true,
        fromHandle: { type: 'source', nodeId: 'other-node-id', id: 'handle-1' },
        toHandle: { type: 'target', nodeId: 'test-node-id', id: 'handle-2' },
        fromNode: { id: 'other-node-id' } as Node,
        toNode: { id: 'test-node-id' } as Node,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', true));

      expect(result.current.showTargetHandle).toBe(false);
    });

    it('接続していない場合、ホバー中はshowSourceHandleとshowTargetHandleの両方がtrueになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      // ホバー開始
      act(() => {
        result.current.handleMouseEnter();
      });

      expect(result.current.showSourceHandle).toBe(true);
      expect(result.current.showTargetHandle).toBe(true);
    });

    it('接続していない場合、ホバーしていない時はshowSourceHandleとshowTargetHandleの両方がfalseになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      expect(result.current.showSourceHandle).toBe(false);
      expect(result.current.showTargetHandle).toBe(false);
    });

    it('他のノードから接続中の場合、isConnectingToThisNodeがtrueになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: true,
        fromHandle: { type: 'source', nodeId: 'other-node-id', id: 'handle-1' },
        toHandle: null,
        fromNode: { id: 'other-node-id' } as Node,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      expect(result.current.isConnectingToThisNode).toBe(true);
    });

    it('自ノードから接続中の場合、isConnectingToThisNodeがfalseになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: true,
        fromHandle: { type: 'source', nodeId: 'test-node-id', id: 'handle-1' },
        toHandle: null,
        fromNode: { id: 'test-node-id' } as Node,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      expect(result.current.isConnectingToThisNode).toBe(false);
    });

    it('接続していない場合、isConnectingToThisNodeがfalseになること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result } = renderHook(() => useHandleHover('test-node-id', false));

      expect(result.current.isConnectingToThisNode).toBe(false);
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にタイマーがクリアされること', () => {
      vi.mocked(useConnection).mockReturnValue({
        inProgress: false,
        fromHandle: null,
        toHandle: null,
        fromNode: null,
        toNode: null,
        fromPosition: null,
        toPosition: null,
      });

      const { result, unmount } = renderHook(() => useHandleHover('test-node-id', false));

      // ホバー開始
      act(() => {
        result.current.handleMouseEnter();
      });

      // ホバー終了
      act(() => {
        result.current.handleMouseLeave();
      });

      // アンマウント
      unmount();

      // タイマーが実行されてもエラーが発生しないこと
      act(() => {
        vi.advanceTimersByTime(200);
      });
    });
  });
});
