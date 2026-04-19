/**
 * useGraphDataSyncカスタムフック
 * ストアデータ（persons, relationships, episodes, episodeParticipations）をReact Flowのノード/エッジに変換し、状態を同期する
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { personsToNodes, relationshipsToEdges, syncNodePositionsToStore, episodesToNodes, participationsToEdges } from '@/lib/graph-utils';
import { resolveCollisions, DEFAULT_COLLISION_OPTIONS } from '@/lib/collision-resolver';
import { computeSnapshotDiff } from '@/lib/snapshot-diff';
import type { Node } from '@xyflow/react';
import type { AnyGraphNode, AnyGraphEdge } from '@/types/graph';
import type { DiffStatus } from '@/lib/diff-highlight';

/**
 * グラフデータ同期フック
 *
 * @description
 * Zustandストアのpersons/relationshipsをReact FlowのNode/Edgeに変換し、
 * 選択状態やForce Layout有効/無効に応じた衝突解消を管理します。
 *
 * @returns ノード/エッジ状態、変更ハンドラ、位置更新コールバック
 */
export function useGraphDataSync() {
  // Zustandストアから状態を取得
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const episodes = useGraphStore((state) => state.episodes);
  const episodeParticipations = useGraphStore((state) => state.episodeParticipations);
  const forceEnabled = useGraphStore((state) => state.forceEnabled);
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const updatePersonPositions = useGraphStore((state) => state.updatePersonPositions);
  const updateEpisodePosition = useGraphStore((state) => state.updateEpisodePosition);
  const edgeFilter = useGraphStore((state) => state.edgeFilter);
  const timelineMode = useGraphStore((state) => state.timelineMode);
  const activeSnapshotIndex = useGraphStore((state) => state.activeSnapshotIndex);
  const previousSnapshotIndex = useGraphStore((state) => state.previousSnapshotIndex);
  // タイムラインモード時のみ snapshots を購読する
  // timelineMode=false の場合は null を返す安定したセレクターにして、
  // スナップショット追加/編集時の不要なuseEffect再実行を防ぐ
  const snapshots = useGraphStore((state) => state.timelineMode ? state.snapshots : null);

  // React Flowのノード/エッジ状態
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyGraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<AnyGraphEdge>([]);

  // React FlowのgetNodes取得
  const { getNodes } = useReactFlow();

  // requestAnimationFrameのIDを保存するref（衝突解消のキャンセル用）
  const collisionResolutionRafIdRef = useRef<number | null>(null);

  // getNodesをrefに退避（useEffectの依存配列から除外するため）
  const getNodesRef = useRef(getNodes);
  getNodesRef.current = getNodes;

  // ノード位置更新のコールバック（useForceLayout用）
  // d3-forceのtickイベントで頻繁に呼ばれるため、既存ノードの選択状態を保持する
  const handleNodesUpdate = useCallback(
    (updatedNodes: Node[]) => {
      setNodes((prevNodes) => {
        // 既存ノードをid -> nodeのマップに変換して高速に参照する
        const prevNodeMap = new Map(prevNodes.map((node) => [node.id, node]));

        // 位置は更新するが、選択状態は既存ノードから引き継ぐ
        const nodesWithSelection = updatedNodes.map((node) => {
          const prevNode = prevNodeMap.get(node.id);
          return {
            ...node,
            selected: prevNode?.selected ?? false,
          };
        });

        return nodesWithSelection as AnyGraphNode[];
      });
    },
    [setNodes]
  );

  // ストアのデータ（persons, relationships, episodes, episodeParticipations）が変更されたらノードとエッジを更新
  // 選択状態の変更ではシミュレーション再初期化を避けるため、selectedPersonIdsを依存配列から除外
  useEffect(() => {
    const newPersonNodes = personsToNodes(persons);
    const newEpisodeNodes = episodesToNodes(episodes);
    const newNodes = [...newPersonNodes, ...newEpisodeNodes];
    // edgeFilter に基づいて表示するエッジを絞り込む
    const newRelEdges = relationshipsToEdges(relationships, edgeFilter);
    const newPartEdges = participationsToEdges(episodeParticipations);
    const newEdges = [...newRelEdges, ...newPartEdges];

    // setNodesの関数型アップデータ内からRAFをスケジュールしています
    // React 18 StrictModeではアップデータが2回呼ばれる可能性がありますが、
    // RAFキャンセルロジック（Line 109-111）により最終的に1つのRAFだけが残ります
    setNodes((prevNodes) => {
      // 既存ノードをid -> nodeのマップに変換して高速に参照する（O(n²) → O(n)）
      const prevNodeMap = new Map(prevNodes.map((node) => [node.id, node]));
      // personsもMapに変換してO(n²)を回避
      const personMap = new Map(persons.map((p) => [p.id, p]));
      // episodesもMapに変換
      const episodeMap = new Map(episodes.map((e) => [e.id, e]));

      // 既存のノード位置を保持しながら更新（選択状態は既存ノードから引き継ぐ）
      const updatedNodes = newNodes.map((newNode) => {
        const existingNode = prevNodeMap.get(newNode.id);
        if (existingNode) {
          // 既存ノードが存在する場合は位置と選択状態を保持
          return {
            ...newNode,
            position: existingNode.position,
            selected: existingNode.selected,
          };
        }
        // 新規ノードの場合: positionが設定されていなければランダム配置
        // Personノードとエピソードノードで同じ方針
        const person = personMap.get(newNode.id);
        const episode = episodeMap.get(newNode.id);
        const hasStoredPosition = person?.position ?? episode?.position;
        return {
          ...newNode,
          position: !hasStoredPosition
            ? {
                x: Math.random() * 500 + 100,
                y: Math.random() * 500 + 100,
              }
            : newNode.position,
          selected: false,
        };
      });

      // 新規ノードが追加された場合、Force Layout無効時は衝突解消を適用
      // idベースで新規ノードを検出（prevNodesに存在しないノードがあるか）
      const hasNewNodes = updatedNodes.some((node) => !prevNodeMap.has(node.id));
      if (hasNewNodes && !forceEnabled) {
        // 前回のrequestAnimationFrameをキャンセル（短時間に複数回変更された場合の対策）
        if (collisionResolutionRafIdRef.current !== null) {
          cancelAnimationFrame(collisionResolutionRafIdRef.current);
        }
        // レンダリング完了後に衝突解消を適用（measuredが設定されるまで待つ）
        collisionResolutionRafIdRef.current = requestAnimationFrame(() => {
          // setNodesの外側で計算（React 18の同時レンダリングで安全）
          const currentNodes = getNodesRef.current();
          const resolvedNodes = resolveCollisions(currentNodes, DEFAULT_COLLISION_OPTIONS);

          // resolveCollisionsは変更がない場合に元の配列を返すため、参照等価性でチェック
          if (resolvedNodes !== currentNodes) {
            // 位置が変更された場合のみ更新
            setNodes(resolvedNodes as AnyGraphNode[]);
            syncNodePositionsToStore(resolvedNodes, updatePersonPositions, updateEpisodePosition);
          }
          collisionResolutionRafIdRef.current = null;
        });
      }

      return updatedNodes;
    });

    // タイムラインモード時にdiffStatusマップを構築する
    // previousSnapshotIndex と activeSnapshotIndex が両方 null でない場合のみdiff計算を行う
    const diffStatusMap = new Map<string, DiffStatus>();
    if (
      timelineMode &&
      previousSnapshotIndex !== null &&
      activeSnapshotIndex !== null &&
      snapshots !== null
    ) {
      const fromSnapshot = snapshots[previousSnapshotIndex];
      const toSnapshot = snapshots[activeSnapshotIndex];
      if (fromSnapshot && toSnapshot) {
        const diff = computeSnapshotDiff(fromSnapshot, toSnapshot);
        for (const rel of diff.relationships.added) {
          diffStatusMap.set(rel.relationshipId, 'added');
        }
        for (const rel of diff.relationships.changed) {
          diffStatusMap.set(rel.relationshipId, 'changed');
        }
        // removed エッジはストア確定後には存在しないため、diffStatusMapには含めない
      }
    }

    // エッジの選択状態は既存エッジから引き継ぐ。タイムラインモード時はdiffStatusも付与する
    setEdges((prevEdges) => {
      const prevEdgeMap = new Map(prevEdges.map((edge) => [edge.id, edge]));
      const updatedEdges = newEdges.map((newEdge) => {
        const existingEdge = prevEdgeMap.get(newEdge.id);
        // タイムラインモードのdiff表示: diffStatusMapに存在するIDのみハイライト（participationエッジは対象外）
        const diffStatus = diffStatusMap.size > 0
          ? (diffStatusMap.get(newEdge.id) ?? null)
          : undefined;
        return {
          ...newEdge,
          selected: existingEdge?.selected ?? false,
          // newEdge.data が存在する場合は diffStatus を付与する。
          // data が undefined の場合（通常は発生しない）はそのまま渡す
          ...(newEdge.data ? { data: { ...newEdge.data, diffStatus } } : {}),
        } as AnyGraphEdge;
      });
      return updatedEdges;
    });

    // クリーンアップ: 未実行のrequestAnimationFrameをキャンセル
    return () => {
      if (collisionResolutionRafIdRef.current !== null) {
        cancelAnimationFrame(collisionResolutionRafIdRef.current);
        collisionResolutionRafIdRef.current = null;
      }
    };
  }, [persons, relationships, episodes, episodeParticipations, setNodes, setEdges, forceEnabled, updatePersonPositions, updateEpisodePosition, edgeFilter, timelineMode, activeSnapshotIndex, previousSnapshotIndex, snapshots]);

  // 選択状態の変更時に既存ノード/エッジのselectedプロパティのみ更新
  // 配列参照を変更しないようにhasChangedフラグで最適化
  useEffect(() => {
    setNodes((prevNodes) => {
      let hasChanged = false;
      const updatedNodes = prevNodes.map((node) => {
        const shouldBeSelected = selectedPersonIds.includes(node.id);
        if (node.selected !== shouldBeSelected) {
          hasChanged = true;
          return { ...node, selected: shouldBeSelected };
        }
        return node;
      });
      return hasChanged ? updatedNodes : prevNodes;
    });

    setEdges((prevEdges) => {
      let hasChanged = false;
      const updatedEdges = prevEdges.map((edge) => {
        // エッジは両端のノードが選択されており、かつ選択数が2の場合に選択状態にする
        const shouldBeSelected =
          selectedPersonIds.length === 2 &&
          selectedPersonIds.includes(edge.source) &&
          selectedPersonIds.includes(edge.target);
        if (edge.selected !== shouldBeSelected) {
          hasChanged = true;
          return { ...edge, selected: shouldBeSelected };
        }
        return edge;
      });
      return hasChanged ? updatedEdges : prevEdges;
    });
  }, [selectedPersonIds, setNodes, setEdges]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    handleNodesUpdate,
    forceEnabled,
  };
}
