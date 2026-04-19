/**
 * useSnapshotTransition フックのユニットテスト
 *
 * スナップショット間のアニメーション遷移の動作を検証する。
 * - requestAnimationFrame をキャプチャして手動実行する方式でrAFアニメーションをテスト
 * - fake timers で setTimeout を制御する
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSnapshotTransition } from './useSnapshotTransition';
import { useGraphStore } from '@/stores/useGraphStore';
import { useReactFlow } from '@xyflow/react';

vi.mock('@/stores/useGraphStore');
vi.mock('@xyflow/react');

const mockUseGraphStore = vi.mocked(useGraphStore);
const mockUseReactFlow = vi.mocked(useReactFlow);

/** テスト用のデフォルトRelationshipNarrative */
const defaultNarrative = { summary: '', notes: '', turningPoints: [] };
/** テスト用のデフォルトRelationshipProperties */
const defaultProperties = { startDate: null, endDate: null, strength: null, customProperties: {} };

/**
 * テスト用のデフォルトスナップショット
 */
const defaultSnapshot = {
  id: 'snap-1',
  label: '第1話',
  persons: [
    {
      personId: 'person-織田',
      name: '織田信長',
      labels: ['武将'],
      position: { x: 100, y: 200 },
      properties: {},
    },
  ],
  relationships: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

/**
 * エッジを含むスナップショット（エッジアニメーションテスト用）
 */
const snapshotWithEdge = {
  id: 'snap-edge',
  label: 'エッジあり',
  persons: [
    { personId: 'person-A', name: '人物A', labels: [], position: { x: 100, y: 100 }, properties: {} },
    { personId: 'person-B', name: '人物B', labels: [], position: { x: 300, y: 100 }, properties: {} },
  ],
  relationships: [
    {
      relationshipId: 'rel-1',
      type: '友人',
      sourceId: 'person-A',
      targetId: 'person-B',
      label: null,
      symmetric: false,
      tags: [],
      colorOverride: null,
      properties: defaultProperties,
      narrative: defaultNarrative,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

/**
 * ストアモックを設定するヘルパー
 */
function setupStoreMock(overrides: {
  snapshots?: unknown[];
  activeSnapshotIndex?: number | null;
  _livePersons?: { id: string; imageDataUrl?: string }[];
  goToSnapshot?: ReturnType<typeof vi.fn>;
}) {
  const goToSnapshot = overrides.goToSnapshot ?? vi.fn();
  mockUseGraphStore.mockReturnValue({
    snapshots: overrides.snapshots ?? [defaultSnapshot],
    activeSnapshotIndex: overrides.activeSnapshotIndex ?? null,
    _livePersons: overrides._livePersons ?? [],
    goToSnapshot,
  } as ReturnType<typeof useGraphStore>);
  return { goToSnapshot };
}

/**
 * React Flow モックを設定するヘルパー
 */
function setupReactFlowMock(overrides: {
  currentNodes?: { id: string; position: { x: number; y: number }; data: object }[];
  setNodes?: ReturnType<typeof vi.fn>;
  setEdges?: ReturnType<typeof vi.fn>;
}) {
  const setNodes = overrides.setNodes ?? vi.fn();
  const setEdges = overrides.setEdges ?? vi.fn();
  mockUseReactFlow.mockReturnValue({
    getNodes: vi.fn().mockReturnValue(overrides.currentNodes ?? []),
    setNodes,
    getEdges: vi.fn().mockReturnValue([]),
    setEdges,
    // useReactFlowの他のメソッドはテスト対象外のため省略
  } as unknown as ReturnType<typeof useReactFlow>);
  return { setNodes, setEdges };
}

describe('useSnapshotTransition', () => {
  // rAFのキャプチャ用
  let capturedRafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    vi.useFakeTimers();

    // requestAnimationFrame をキャプチャ（呼ばれたコールバックを手動実行できるようにする）
    capturedRafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      capturedRafCallbacks.push(cb);
      return capturedRafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      capturedRafCallbacks = [];
    });

    // performance.now をモック（アニメーション完了状態をシミュレートする）
    vi.stubGlobal('performance', { now: vi.fn(() => 400) });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('初期状態では isTransitioning は false である', () => {
    // GIVEN
    setupStoreMock({});
    setupReactFlowMock({});

    // WHEN
    const { result } = renderHook(() => useSnapshotTransition());

    // THEN
    expect(result.current.isTransitioning).toBe(false);
  });

  it('transitionToSnapshot を呼ぶと isTransitioning が true になる', () => {
    // GIVEN
    setupStoreMock({ snapshots: [defaultSnapshot] });
    setupReactFlowMock({});
    const { result } = renderHook(() => useSnapshotTransition());

    // WHEN
    act(() => {
      result.current.transitionToSnapshot(0);
    });

    // THEN: アニメーション開始で isTransitioning=true
    expect(result.current.isTransitioning).toBe(true);
  });

  it('transitionToSnapshot を呼ぶと requestAnimationFrame が起動される', () => {
    // GIVEN
    setupStoreMock({ snapshots: [defaultSnapshot] });
    setupReactFlowMock({});
    const { result } = renderHook(() => useSnapshotTransition());

    // WHEN
    act(() => {
      result.current.transitionToSnapshot(0);
    });

    // THEN: rAFが少なくとも1回呼ばれている
    expect(capturedRafCallbacks.length).toBeGreaterThan(0);
  });

  it('rAF コールバック実行後に setNodes が呼ばれる', () => {
    // GIVEN: 現在ノードは空、対象スナップショットに人物が1人
    setupStoreMock({ snapshots: [defaultSnapshot] });
    const { setNodes } = setupReactFlowMock({ currentNodes: [] });
    const { result } = renderHook(() => useSnapshotTransition());

    // WHEN: アニメーション開始
    act(() => {
      result.current.transitionToSnapshot(0);
    });

    // rAF コールバックを手動実行（performance.now() = 400 > TRANSITION_DURATION_MS = 300）
    act(() => {
      const callbacks = [...capturedRafCallbacks];
      capturedRafCallbacks = [];
      callbacks.forEach((cb) => cb(400));
    });

    // THEN: setNodes が呼ばれてノードが設定された
    expect(setNodes).toHaveBeenCalled();
  });

  it('TRANSITION_DURATION_MS 後に goToSnapshot が呼ばれる', () => {
    // GIVEN
    const { goToSnapshot } = setupStoreMock({ snapshots: [defaultSnapshot] });
    setupReactFlowMock({});
    const { result } = renderHook(() => useSnapshotTransition());

    act(() => {
      result.current.transitionToSnapshot(0);
    });

    expect(goToSnapshot).not.toHaveBeenCalled();

    // WHEN: TRANSITION_DURATION_MS (300ms) 経過
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // THEN: ストアのgoToSnapshotが正しいインデックスで呼ばれる
    expect(goToSnapshot).toHaveBeenCalledWith(0);
  });

  it('TRANSITION_DURATION_MS 後に isTransitioning が false になる', () => {
    // GIVEN
    setupStoreMock({ snapshots: [defaultSnapshot] });
    setupReactFlowMock({});
    const { result } = renderHook(() => useSnapshotTransition());

    act(() => {
      result.current.transitionToSnapshot(0);
    });
    expect(result.current.isTransitioning).toBe(true);

    // WHEN: 300ms経過
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // THEN
    expect(result.current.isTransitioning).toBe(false);
  });

  it('存在しないインデックスを指定しても何もしない', () => {
    // GIVEN: スナップショット1件
    const { goToSnapshot } = setupStoreMock({ snapshots: [defaultSnapshot] });
    setupReactFlowMock({});
    const { result } = renderHook(() => useSnapshotTransition());

    // WHEN: 存在しないインデックス（index=5）
    act(() => {
      result.current.transitionToSnapshot(5);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // THEN: goToSnapshot は呼ばれない
    expect(goToSnapshot).not.toHaveBeenCalled();
    expect(result.current.isTransitioning).toBe(false);
  });

  it('rAF コールバック実行後に setEdges が呼ばれる（エッジアニメーション）', () => {
    // GIVEN: エッジを含むスナップショットへ遷移
    setupStoreMock({ snapshots: [snapshotWithEdge] });
    const { setEdges } = setupReactFlowMock({ currentNodes: [] });
    const { result } = renderHook(() => useSnapshotTransition());

    // WHEN: アニメーション開始
    act(() => {
      result.current.transitionToSnapshot(0);
    });

    // rAF コールバックを手動実行
    act(() => {
      const callbacks = [...capturedRafCallbacks];
      capturedRafCallbacks = [];
      callbacks.forEach((cb) => cb(400));
    });

    // THEN: setEdges が呼ばれてエッジが設定された
    expect(setEdges).toHaveBeenCalled();
  });

  it('遷移中に再度 transitionToSnapshot を呼ぶと前のアニメーションがキャンセルされる', () => {
    // GIVEN: スナップショット2件
    const snapshot2 = {
      ...defaultSnapshot,
      id: 'snap-2',
      label: '第2話',
    };
    const { goToSnapshot } = setupStoreMock({ snapshots: [defaultSnapshot, snapshot2] });
    setupReactFlowMock({});
    const { result } = renderHook(() => useSnapshotTransition());

    // WHEN: index=0 の遷移を開始
    act(() => {
      result.current.transitionToSnapshot(0);
    });

    // すぐに index=1 に遷移（前のアニメーションをキャンセル）
    act(() => {
      result.current.transitionToSnapshot(1);
    });

    // 300ms 後
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // THEN: 最後に呼ばれた index=1 のみ goToSnapshot が呼ばれる
    expect(goToSnapshot).toHaveBeenCalledTimes(1);
    expect(goToSnapshot).toHaveBeenCalledWith(1);
  });
});
