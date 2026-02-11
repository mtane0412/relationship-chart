/**
 * useGraphContextMenuActionsカスタムフック
 * コンテキストメニュー項目の構築を管理する
 */

import { useCallback, useMemo } from 'react';
import { useReactFlow, type Node } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import { getNodeCenter, VIEWPORT_ANIMATION_DURATION } from '@/lib/viewport-utils';
import { UserPlus, XCircle, Pencil, Trash2, Maximize2, Link, ArrowLeft } from 'lucide-react';
import type { ContextMenuState } from './useContextMenu';
import type { ContextMenuItem } from './ContextMenu';
import type { RelationshipEdge } from '@/types/graph';
import type { PendingConnection, PendingRegistration } from './useGraphInteractions';

/**
 * useGraphContextMenuActionsフックのパラメータ
 */
type UseGraphContextMenuActionsParams = {
  /** コンテキストメニューの状態 */
  contextMenu: ContextMenuState | null;
  /** グラフのエッジ配列 */
  edges: RelationshipEdge[];
  /** 関係登録の待機状態をセットする関数 */
  setPendingConnection: (pending: PendingConnection | null) => void;
  /** 人物登録の待機状態をセットする関数 */
  setPendingRegistration: (pending: PendingRegistration | null) => void;
  /** コンテキストメニューを閉じる関数 */
  closeContextMenu: () => void;
  /** 関係追加モードに切り替える関数 */
  switchToAddRelationshipMode: (sourceNodeId: string, position: { x: number; y: number }) => void;
  /** ノードコンテキストメニューハンドラ（「戻る」ボタンで使用） */
  handleNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
};

/**
 * コンテキストメニュー項目構築フック
 *
 * @param params - フックのパラメータ
 * @returns コンテキストメニュー項目配列
 *
 * @description
 * コンテキストメニューの種類（ノード、エッジ、背景、関係追加モード）に応じて、
 * 適切なメニュー項目を動的に構築します。
 */
export function useGraphContextMenuActions({
  contextMenu,
  edges,
  setPendingConnection,
  setPendingRegistration,
  closeContextMenu,
  switchToAddRelationshipMode,
  handleNodeContextMenu,
}: UseGraphContextMenuActionsParams) {
  // Zustandストアから状態とアクションを取得
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const selectedPersonIds = useGraphStore((state) => state.selectedPersonIds);
  const setSelectedPersonIds = useGraphStore((state) => state.setSelectedPersonIds);
  const removePerson = useGraphStore((state) => state.removePerson);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const setSidePanelOpen = useGraphStore((state) => state.setSidePanelOpen);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  // ダイアログストアから確認ダイアログを取得
  const openConfirm = useDialogStore((state) => state.openConfirm);

  // React Flow APIを取得
  const { getNode, setCenter } = useReactFlow();

  // まだ繋がっていないノードを取得するヘルパー関数
  const getUnconnectedNodes = useCallback(
    (sourceNodeId: string) => {
      // 指定されたノードと関係を持っているノードのIDセット
      const connectedNodeIds = new Set<string>();
      relationships.forEach((rel) => {
        if (rel.sourcePersonId === sourceNodeId) {
          connectedNodeIds.add(rel.targetPersonId);
        } else if (rel.targetPersonId === sourceNodeId) {
          connectedNodeIds.add(rel.sourcePersonId);
        }
      });

      // まだ繋がっていないノード（自分自身と既に繋がっているノードを除外）
      return persons.filter(
        (p) => p.id !== sourceNodeId && !connectedNodeIds.has(p.id)
      );
    },
    [persons, relationships]
  );

  // ノード右クリックメニュー項目を構築
  const buildNodeMenuItems = useCallback(
    (nodeId: string): ContextMenuItem[] => {
      const person = persons.find((p) => p.id === nodeId);
      const unconnectedNodes = getUnconnectedNodes(nodeId);

      const items: ContextMenuItem[] = [
        {
          label: '中心に表示',
          icon: Maximize2,
          onClick: () => {
            // ノードの中心点を取得して表示位置を移動
            const node = getNode(nodeId);
            if (node) {
              const center = getNodeCenter(node);
              setCenter(center.x, center.y, { zoom: 1, duration: VIEWPORT_ANIMATION_DURATION });
            }
            closeContextMenu();
          },
        },
      ];

      // まだ繋がっていないノードが存在する場合は「関係を追加」を追加
      if (unconnectedNodes.length > 0) {
        items.push({
          label: '関係を追加',
          icon: Link,
          closeOnClick: false, // モード切り替えなのでメニューを閉じない
          onClick: () => {
            // 関係追加モードに切り替え
            switchToAddRelationshipMode(nodeId, contextMenu!.position);
          },
        });
      }

      items.push(
        {
          label: '',
          separator: true,
          onClick: () => {}, // セパレーターなので何もしない
        },
        {
          label: '編集',
          icon: Pencil,
          onClick: () => {
            setSelectedPersonIds([nodeId]);
            setSidePanelOpen(true); // サイドパネルを開く
            closeContextMenu();
          },
        },
        {
          label: '削除',
          icon: Trash2,
          danger: true,
          onClick: async () => {
            closeContextMenu();
            const confirmed = await openConfirm({
              message: `「${person?.name || '不明な人物'}」を削除してもよろしいですか？`,
              isDanger: true,
            });
            if (confirmed) {
              removePerson(nodeId);
            }
          },
        }
      );

      return items;
    },
    [
      persons,
      getUnconnectedNodes,
      getNode,
      setCenter,
      closeContextMenu,
      switchToAddRelationshipMode,
      contextMenu,
      setSelectedPersonIds,
      removePerson,
      setSidePanelOpen,
      openConfirm,
    ]
  );

  // 関係追加モードメニュー項目を構築
  const buildAddRelationshipMenuItems = useCallback(
    (sourceNodeId: string): ContextMenuItem[] => {
      const unconnectedNodes = getUnconnectedNodes(sourceNodeId);

      const items: ContextMenuItem[] = [
        {
          label: '戻る',
          icon: ArrowLeft,
          closeOnClick: false, // モード切り替えなのでメニューを閉じない
          onClick: () => {
            // ノードメニューに戻る
            // 注: handleNodeContextMenuを再利用するため、最小限のMouseEventを構築
            // position.x/yは既に補正済みのため、adjustPositionは冪等（再補正しても同じ結果）
            const node = getNode(sourceNodeId);
            if (node) {
              handleNodeContextMenu(
                { preventDefault: () => {}, clientX: contextMenu!.position.x, clientY: contextMenu!.position.y } as React.MouseEvent,
                node
              );
            } else {
              closeContextMenu();
            }
          },
        },
        {
          label: '',
          separator: true,
          onClick: () => {},
        },
      ];

      // まだ繋がっていないノードのリストを追加（アイコン + 名前）
      unconnectedNodes.forEach((targetPerson) => {
        items.push({
          label: targetPerson.name,
          imageUrl: targetPerson.imageDataUrl,
          filterable: true, // 検索フィルター対象
          onClick: () => {
            setPendingConnection({
              sourcePersonId: sourceNodeId,
              targetPersonId: targetPerson.id,
            });
            closeContextMenu();
          },
        });
      });

      return items;
    },
    [
      getUnconnectedNodes,
      getNode,
      handleNodeContextMenu,
      contextMenu,
      closeContextMenu,
      setPendingConnection,
    ]
  );

  // エッジ右クリックメニュー項目を構築
  const buildEdgeMenuItems = useCallback(
    (edgeId: string): ContextMenuItem[] => {
      const edge = edges.find((e) => e.id === edgeId);
      return [
        {
          label: '関係を編集',
          icon: Pencil,
          onClick: () => {
            if (edge) {
              setSelectedPersonIds([edge.source, edge.target]);
              setSidePanelOpen(true); // サイドパネルを開く
            }
            closeContextMenu();
          },
        },
        {
          label: '関係を削除',
          icon: Trash2,
          danger: true,
          onClick: async () => {
            closeContextMenu();
            const confirmed = await openConfirm({
              message: `「${edge?.data?.sourceToTargetLabel || '不明な関係'}」を削除してもよろしいですか？`,
              isDanger: true,
            });
            if (confirmed) {
              removeRelationship(edgeId);
            }
          },
        },
      ];
    },
    [edges, setSelectedPersonIds, closeContextMenu, removeRelationship, setSidePanelOpen, openConfirm]
  );

  // 背景右クリックメニュー項目を構築
  const buildPaneMenuItems = useCallback(
    (flowPosition: { x: number; y: number }): ContextMenuItem[] => {
      const items: ContextMenuItem[] = [
        {
          label: 'ここにノードを追加',
          icon: UserPlus,
          onClick: () => {
            setPendingRegistration({
              position: flowPosition,
            });
            closeContextMenu();
          },
        },
      ];

      // 選択がある場合は「選択をすべて解除」を追加
      if (selectedPersonIds.length > 0) {
        items.push({
          label: '',
          separator: true,
          onClick: () => {}, // セパレーターなので何もしない
        });
        items.push({
          label: '選択をすべて解除',
          icon: XCircle,
          onClick: () => {
            clearSelection();
            closeContextMenu();
          },
        });
      }

      return items;
    },
    [selectedPersonIds, setPendingRegistration, closeContextMenu, clearSelection]
  );

  // コンテキストメニュー項目の構築
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    if (!contextMenu) return [];

    switch (contextMenu.type) {
      case 'node':
        return buildNodeMenuItems(contextMenu.nodeId);
      case 'add-relationship':
        return buildAddRelationshipMenuItems(contextMenu.sourceNodeId);
      case 'edge':
        return buildEdgeMenuItems(contextMenu.edgeId);
      case 'pane':
        return buildPaneMenuItems(contextMenu.flowPosition);
      default:
        return [];
    }
  }, [
    contextMenu,
    buildNodeMenuItems,
    buildAddRelationshipMenuItems,
    buildEdgeMenuItems,
    buildPaneMenuItems,
  ]);

  return contextMenuItems;
}
