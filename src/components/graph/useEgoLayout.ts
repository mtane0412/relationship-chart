/**
 * useEgoLayoutカスタムフック
 * EGO Network放射状レイアウトを適用する
 */

import { useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { computeGraphDistances, computeRadialPositions } from '@/lib/ego-layout';
import { syncNodePositionsToStore } from '@/lib/graph-utils';

/**
 * イージング関数: easeOutCubic
 * @param t - 0〜1の値（0: アニメーション開始、1: アニメーション終了）
 * @returns イージング後の値（0〜1）
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * useEgoLayoutフックの戻り値型
 */
export type UseEgoLayoutResult = {
  /**
   * EGO Layoutを適用する
   * @param centerNodeId - 中心ノードのID
   */
  applyEgoLayout: (centerNodeId: string) => void;
};

/**
 * EGO Network放射状レイアウトを適用するカスタムフック
 *
 * @returns applyEgoLayout関数
 *
 * @description
 * 中心ノードからのグラフ距離に基づいて、ノードを放射状に配置します。
 * アニメーション（300ms）で滑らかに配置し、配置後はノードを自由に移動できます。
 *
 * @example
 * ```tsx
 * const { applyEgoLayout } = useEgoLayout();
 *
 * const handleApply = () => {
 *   applyEgoLayout(selectedNodeId);
 * };
 * ```
 */
export function useEgoLayout(): UseEgoLayoutResult {
  const { getNodes, setNodes, getViewport } = useReactFlow();
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const egoLayoutParams = useGraphStore((state) => state.egoLayoutParams);
  const forceEnabled = useGraphStore((state) => state.forceEnabled);
  const setForceEnabled = useGraphStore((state) => state.setForceEnabled);
  const updatePersonPositions = useGraphStore((state) => state.updatePersonPositions);

  // アニメーションフレームIDを保持（連続クリック時のキャンセル用）
  const animationFrameRef = useRef<number | null>(null);

  const applyEgoLayout = useCallback(
    (centerNodeId: string) => {
      // 前回のアニメーションをキャンセル
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Force Layout有効中は一旦無効化
      if (forceEnabled) {
        setForceEnabled(false);
      }

      // ビューポートの中心座標を計算
      const viewport = getViewport();
      const viewportCenterX = -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
      const viewportCenterY = -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;

      // グラフ距離を計算
      const distances = computeGraphDistances(centerNodeId, persons, relationships);

      // 放射状の位置を計算
      const allPersonIds = persons.map((p) => p.id);
      const targetPositions = computeRadialPositions(
        centerNodeId,
        distances,
        allPersonIds,
        egoLayoutParams,
        { x: viewportCenterX, y: viewportCenterY }
      );

      // 現在のノード位置を取得
      const currentNodes = getNodes();
      const startPositions = new Map(
        currentNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
      );

      // アニメーション設定
      const duration = 300; // 300ms
      const startTime = performance.now();

      // アニメーションフレーム
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        // 各ノードの位置を補間
        const updatedNodes = currentNodes.map((node) => {
          const startPos = startPositions.get(node.id);
          const targetPos = targetPositions.get(node.id);

          if (!startPos || !targetPos) {
            return node;
          }

          return {
            ...node,
            position: {
              x: startPos.x + (targetPos.x - startPos.x) * easedProgress,
              y: startPos.y + (targetPos.y - startPos.y) * easedProgress,
            },
          };
        });

        setNodes(updatedNodes);

        // アニメーション継続判定
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = null;
          // アニメーション完了時に全ノード位置をストアに書き戻す
          syncNodePositionsToStore(updatedNodes, updatePersonPositions);
        }
      };

      // アニメーション開始
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [
      persons,
      relationships,
      egoLayoutParams,
      forceEnabled,
      setForceEnabled,
      getNodes,
      setNodes,
      getViewport,
      updatePersonPositions,
    ]
  );

  return {
    applyEgoLayout,
  };
}
