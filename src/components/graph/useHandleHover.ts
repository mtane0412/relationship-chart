/**
 * ノードのエッジ接続ハンドルのホバー状態管理フック
 *
 * 画像ノードからハンドルのリング部分にマウスが移動する際の
 * ホバー状態の維持を実現するため、onMouseLeaveに200msの遅延を追加している。
 * この実装はRelationshipEdge.tsxのパターンを踏襲している。
 *
 * @param nodeId - 対象ノードのID
 * @returns ホバー状態とイベントハンドラー、ハンドル表示フラグ
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useConnection } from '@xyflow/react';

export interface UseHandleHoverResult {
  /** ノードがホバーされているかどうか */
  isHovered: boolean;
  /** マウスエンター時のハンドラー */
  handleMouseEnter: () => void;
  /** マウスリーブ時のハンドラー */
  handleMouseLeave: () => void;
  /** ソースハンドルを表示するかどうか */
  showSourceHandle: boolean;
  /** ターゲットハンドルを表示するかどうか */
  showTargetHandle: boolean;
}

export function useHandleHover(nodeId: string): UseHandleHoverResult {
  const [isHovered, setIsHovered] = useState(false);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connection = useConnection();

  const handleMouseEnter = useCallback(() => {
    // 遅延タイマーをクリア
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // 200ms後にホバー状態を解除（RelationshipEdge.tsxと同じパターン）
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      leaveTimeoutRef.current = null;
    }, 200);
  }, []);

  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  // 接続中のハンドル表示判定
  const showSourceHandle =
    isHovered &&
    !(connection.inProgress && connection.fromNode?.id === nodeId);

  const showTargetHandle =
    isHovered &&
    !(connection.inProgress && connection.toNode?.id === nodeId);

  return {
    isHovered,
    handleMouseEnter,
    handleMouseLeave,
    showSourceHandle,
    showTargetHandle,
  };
}
