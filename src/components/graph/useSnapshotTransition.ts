/**
 * useSnapshotTransition フック
 *
 * スナップショット間のアニメーション遷移を管理するフック。
 * 以下のアニメーションを組み合わせて滑らかなスナップショット切り替えを実現する:
 * - ノード位置移動: rAF + easeOutCubic によるフレーム補間
 * - ノード出現（追加）: opacity 0→1 のフェードイン
 * - ノード消滅（削除）: opacity 1→0 のフェードアウト
 *
 * 設計方針:
 * - アニメーション中はストアの persons/relationships を変更しない
 *   → useGraphDataSync の useEffect が発火せず、アニメーションと競合しない
 * - TRANSITION_DURATION_MS 後に setTimeout でストアの goToSnapshot を呼んで状態を確定する
 * - 連続呼び出しには cancelAnimationFrame + clearTimeout で前のアニメーションをキャンセルする
 * - ノードの style.opacity を直接操作することでフェードイン/フェードアウトを実現する
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { useGraphStore } from '@/stores/useGraphStore';
import type { GraphNode } from '@/types/graph';

/** アニメーション時間（ミリ秒） */
const TRANSITION_DURATION_MS = 300;

/**
 * useSnapshotTransition フックの戻り値型
 */
export type UseSnapshotTransitionResult = {
  /**
   * アニメーション付きで指定インデックスのスナップショットへ遷移する
   * @param index - 遷移先スナップショットのインデックス
   */
  transitionToSnapshot: (index: number) => void;
  /** アニメーション遷移中かどうか */
  isTransitioning: boolean;
};

/**
 * イージング関数: easeOutCubic
 * @param t - 0〜1の値（0: 開始、1: 完了）
 * @returns イージング後の値（0〜1）
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * スナップショット間アニメーション遷移フック
 *
 * @returns transitionToSnapshot 関数と isTransitioning フラグ
 */
export function useSnapshotTransition(): UseSnapshotTransitionResult {
  const { getNodes, setNodes } = useReactFlow();

  const { snapshots, _livePersons, goToSnapshot } = useGraphStore(
    useShallow((state) => ({
      snapshots: state.snapshots,
      _livePersons: state._livePersons,
      goToSnapshot: state.goToSnapshot,
    }))
  );

  const [isTransitioning, setIsTransitioning] = useState(false);

  // 前回のアニメーションをキャンセルするためのref
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useCallback の依存配列に入れられない値をrefで保持する
  const storeRef = useRef({ snapshots, _livePersons, goToSnapshot });
  storeRef.current = { snapshots, _livePersons, goToSnapshot };

  const transitionToSnapshot = useCallback(
    (targetIndex: number) => {
      const { snapshots: currentSnapshots, _livePersons: livePersons, goToSnapshot: storeGoToSnapshot } =
        storeRef.current;

      const targetSnapshot = currentSnapshots[targetIndex];
      // 存在しないインデックスは何もしない（Fail-Fast）
      if (!targetSnapshot) return;

      // 前回のアニメーションをキャンセル
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // ライブPersonsのMapを構築（imageDataUrl引き当て用）
      const livePersonMap = new Map((livePersons ?? []).map((p) => [p.id, p]));

      // 現在のReact Flowノードを取得（アニメーション開始位置）
      const currentNodes = getNodes();
      const currentNodeMap = new Map(currentNodes.map((n) => [n.id, n]));

      // 遷移先スナップショットからターゲットノードを構築する
      const targetNodes: GraphNode[] = targetSnapshot.persons.map((sp) => ({
        id: sp.personId,
        type: 'graph' as const,
        data: {
          name: sp.name,
          imageDataUrl: livePersonMap.get(sp.personId)?.imageDataUrl,
          labels: sp.labels,
        },
        position: sp.position ?? { x: 0, y: 0 },
      }));
      const targetNodeMap = new Map(targetNodes.map((n) => [n.id, n]));

      // アニメーション開始位置を記録（移動ノードの補間用）
      const startPositions = new Map(
        currentNodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }])
      );
      const startTime = performance.now();

      setIsTransitioning(true);

      /**
       * rAF アニメーションループ
       * - ターゲットノード: 出現（opacity 0→1）または位置補間（opacity 1）
       * - 削除ノード: 消滅（opacity 1→0）
       */
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / TRANSITION_DURATION_MS, 1);
        const easedProgress = easeOutCubic(progress);

        const animatedNodes: GraphNode[] = [];

        // ターゲットノード（維持/追加）: 位置補間 + フェードイン
        for (const targetNode of targetNodes) {
          const startPos = startPositions.get(targetNode.id) ?? targetNode.position;
          const isNewNode = !currentNodeMap.has(targetNode.id);

          animatedNodes.push({
            ...targetNode,
            position: {
              x: startPos.x + (targetNode.position.x - startPos.x) * easedProgress,
              y: startPos.y + (targetNode.position.y - startPos.y) * easedProgress,
            },
            style: {
              // 新規ノードはフェードイン、既存ノードは不透明のまま
              opacity: isNewNode ? easedProgress : 1,
            },
          });
        }

        // 削除ノード: フェードアウト（ターゲットに存在しないもの）
        for (const [id, currentNode] of currentNodeMap) {
          if (!targetNodeMap.has(id)) {
            animatedNodes.push({
              ...(currentNode as GraphNode),
              style: {
                opacity: 1 - easedProgress,
              },
            });
          }
        }

        setNodes(animatedNodes);

        // アニメーション継続判定
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      // TRANSITION_DURATION_MS 後にストア状態を確定させる（authoritative trigger）
      timeoutRef.current = setTimeout(() => {
        // 万が一rAFが残っていればキャンセル
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        // ストアのpersons/relationshipsを更新してuseGraphDataSyncに再同期させる
        storeGoToSnapshot(targetIndex);
        setIsTransitioning(false);
        timeoutRef.current = null;
      }, TRANSITION_DURATION_MS);
    },
    [getNodes, setNodes]
  );

  return { transitionToSnapshot, isTransitioning };
}
