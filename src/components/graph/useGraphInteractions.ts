/**
 * useGraphInteractionsカスタムフック
 * D&D/ペースト/接続/削除/選択などのインタラクション処理を管理する
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useReactFlow, type Connection, type Node, type Edge, type OnSelectionChangeParams } from '@xyflow/react';
import { useGraphStore } from '@/stores/useGraphStore';
import { useDialogStore } from '@/stores/useDialogStore';
import { readFileAsDataUrl } from '@/lib/image-utils';
import { findClosestTargetNode } from '@/lib/connection-target-detection';
import type { GraphNode, RelationshipEdge } from '@/types/graph';
import type { RelationshipType } from '@/types/relationship';
import type { NodeKind } from '@/types/person';
import type { ContextMenuState } from './useContextMenu';

/**
 * 画像D&D/ペースト時の登録待ちデータ
 */
export type PendingRegistration = {
  rawImageSrc?: string;
  position: { x: number; y: number };
};

/**
 * エッジ接続時の登録待ちデータ
 */
export type PendingConnection = {
  sourcePersonId: string;
  targetPersonId: string;
  /** 編集対象の既存関係ID（編集モードの場合） */
  existingRelationshipId?: string;
};

/**
 * useGraphInteractionsフックのパラメータ
 */
type UseGraphInteractionsParams = {
  /** コンテキストメニューの状態 */
  contextMenu: ContextMenuState | null;
  /** コンテキストメニューを閉じる関数 */
  closeContextMenu: () => void;
};

/**
 * グラフインタラクション管理フック
 *
 * @param params - フックのパラメータ
 * @returns インタラクションハンドラと状態
 *
 * @description
 * RelationshipGraphコンポーネントのインタラクション処理を集約します：
 * - 画像D&D/ペースト
 * - エッジ接続
 * - ノード/エッジ削除
 * - 選択状態の管理
 * - モーダル表示制御
 */
export function useGraphInteractions({
  contextMenu,
  closeContextMenu,
}: UseGraphInteractionsParams) {
  // Zustandストアから状態とアクションを取得
  const persons = useGraphStore((state) => state.persons);
  const relationships = useGraphStore((state) => state.relationships);
  const addPerson = useGraphStore((state) => state.addPerson);
  const addRelationship = useGraphStore((state) => state.addRelationship);
  const updateRelationship = useGraphStore((state) => state.updateRelationship);
  const removePerson = useGraphStore((state) => state.removePerson);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const setSelectedPersonIds = useGraphStore((state) => state.setSelectedPersonIds);
  const clearSelection = useGraphStore((state) => state.clearSelection);

  // ダイアログストアから確認ダイアログとアラートダイアログを取得
  const openConfirm = useDialogStore((state) => state.openConfirm);
  const openAlert = useDialogStore((state) => state.openAlert);

  // React Flow APIを取得
  const { screenToFlowPosition, getNodes } = useReactFlow();

  // 登録モーダルの状態
  const [pendingRegistration, setPendingRegistration] = useState<PendingRegistration | null>(null);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  // onConnectが呼ばれたかどうかを追跡するフラグ
  const onConnectCalledRef = useRef(false);

  // 接続元ノードIDを保存するref（onConnectEndで使用）
  const connectingFromNodeIdRef = useRef<string | null>(null);

  // getNodesをrefに退避（依存配列から除外するため）
  const getNodesRef = useRef(getNodes);
  getNodesRef.current = getNodes;

  // 2人のperson間の接続を処理するヘルパー関数
  const tryStartConnection = useCallback(
    (sourcePersonId: string, targetPersonId: string) => {
      // 自己接続を防止
      if (sourcePersonId === targetPersonId) return;

      // 両方の人物が実際に存在することを確認
      const sourcePerson = persons.find((p) => p.id === sourcePersonId);
      const targetPerson = persons.find((p) => p.id === targetPersonId);
      if (!sourcePerson || !targetPerson) return;

      // 同じペアの関係が既に存在するかチェック（方向問わず）
      const existingRelationship = relationships.find(
        (r) =>
          (r.sourcePersonId === sourcePersonId && r.targetPersonId === targetPersonId) ||
          (r.sourcePersonId === targetPersonId && r.targetPersonId === sourcePersonId)
      );

      // pendingConnectionをセット（既存関係がある場合は編集モード）
      setPendingConnection({
        sourcePersonId,
        targetPersonId,
        ...(existingRelationship ? { existingRelationshipId: existingRelationship.id } : {}),
      });
    },
    [persons, relationships]
  );

  // キャンバスへの画像ドロップハンドラ
  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // ドロップされたファイルを取得
      const files = Array.from(event.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (!imageFile) return;

      try {
        // 元画像をData URLに変換（リサイズなし）
        const rawImageSrc = await readFileAsDataUrl(imageFile);

        // ドロップ位置をReact Flowの座標系に変換
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // モーダルを開く
        setPendingRegistration({ rawImageSrc, position });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('画像処理に失敗しました:', error);
        }
        await openAlert({
          title: 'エラー',
          message: '画像の処理に失敗しました。\n画像ファイルが正しいか、サイズが10MB以下か確認してください。',
        });
      }
    },
    [screenToFlowPosition, openAlert]
  );

  // ドラッグオーバーハンドラ（ドロップを許可するために必要）
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  // クリップボードからのペーストハンドラ
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      // クリップボードから画像を検出
      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith('image/')
      );

      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      try {
        // 元画像をData URLに変換（リサイズなし）
        const rawImageSrc = await readFileAsDataUrl(file);

        // キャンバス中央の座標を計算（screenToFlowPositionはここでは使えないので概算）
        const position = { x: 400, y: 300 };

        // モーダルを開く
        setPendingRegistration({ rawImageSrc, position });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('画像処理に失敗しました:', error);
        }
        await openAlert({
          title: 'エラー',
          message: '画像の処理に失敗しました。\n画像ファイルが正しいか、サイズが10MB以下か確認してください。',
        });
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [openAlert]);

  // Undo/Redoキーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // モーダルまたはコンテキストメニューが開いている時はスキップ
      if (pendingRegistration !== null || pendingConnection !== null || contextMenu !== null) {
        return;
      }

      // input/textarea/contentEditable内ではスキップ（ブラウザ標準のテキストundoを優先）
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const key = event.key.toLowerCase();

      // Cmd+Z (macOS) / Ctrl+Z (Windows): Undo
      if ((event.metaKey || event.ctrlKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        useGraphStore.temporal.getState().undo();
        return;
      }

      // Cmd+Shift+Z (macOS) / Ctrl+Shift+Z (Windows): Redo
      if ((event.metaKey || event.ctrlKey) && key === 'z' && event.shiftKey) {
        event.preventDefault();
        useGraphStore.temporal.getState().redo();
        return;
      }

      // Ctrl+Y (Windows標準のRedo): Redo
      if (event.ctrlKey && key === 'y' && !event.shiftKey && !event.metaKey) {
        event.preventDefault();
        useGraphStore.temporal.getState().redo();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingRegistration, pendingConnection, contextMenu]);

  // 選択変更ハンドラ（React Flowの選択状態をストアに同期）
  // 注: 無限ループを避けるため、選択状態の同期は一方向（Zustand → React Flow）のみにする
  // ユーザーによる選択はonNodeClickで処理する
  const handleSelectionChange = useCallback(
    (_params: OnSelectionChangeParams) => {
      // 何もしない（一方向同期のため）
    },
    []
  );

  // ノードクリックハンドラ（選択状態を更新）
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Shiftキーが押されている場合は複数選択（トグル）
      if (event.shiftKey) {
        const currentSelectedIds = useGraphStore.getState().selectedPersonIds;
        const isSelected = currentSelectedIds.includes(node.id);
        if (isSelected) {
          // 選択解除
          setSelectedPersonIds(currentSelectedIds.filter((id) => id !== node.id));
        } else {
          // 選択追加
          setSelectedPersonIds([...currentSelectedIds, node.id]);
        }
      } else {
        // 通常クリック：単一選択
        setSelectedPersonIds([node.id]);
      }
    },
    [setSelectedPersonIds]
  );

  // 背景クリックハンドラ
  const handlePaneClick = useCallback(() => {
    // コンテキストメニューが表示されている場合はメニューを閉じるのみ（選択解除しない）
    // 注: ContextMenuコンポーネント側でもmousedownで閉じ処理が走るが、
    // mousedown(ContextMenu) → click(handlePaneClick)の順で発火するため問題ない
    if (contextMenu) {
      closeContextMenu();
      return;
    }
    clearSelection();
  }, [clearSelection, contextMenu, closeContextMenu]);

  // エッジクリックハンドラ（エッジに対応する2人を選択状態にする）
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // エッジのsourceとtargetが存在することを確認
      if (!edge.source || !edge.target) {
        return;
      }

      // setTimeoutで遅延させることで、React FlowのonSelectionChangeとの競合を避ける
      setTimeout(() => {
        setSelectedPersonIds([edge.source, edge.target]);
      }, 0);
    },
    [setSelectedPersonIds]
  );

  // エッジ接続開始ハンドラ
  const handleConnectStart = useCallback(
    (_event: MouseEvent | TouchEvent, params: { nodeId: string | null; handleId: string | null }) => {
      // 接続元ノードIDを保存
      connectingFromNodeIdRef.current = params.nodeId;
    },
    []
  );

  // エッジ接続ハンドラ
  const handleConnect = useCallback(
    (connection: Connection) => {
      // onConnectが呼ばれたことを記録
      onConnectCalledRef.current = true;

      // sourceとtargetが存在することを確認
      if (connection.source && connection.target) {
        tryStartConnection(connection.source, connection.target);
      }
    },
    [tryStartConnection]
  );

  // エッジ接続終了ハンドラ（プレビューラインがターゲットノードとつながっている場合の接続）
  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      // onConnectが既に呼ばれていた場合は何もしない（重複接続を防止）
      if (onConnectCalledRef.current) {
        onConnectCalledRef.current = false; // フラグをリセット
        connectingFromNodeIdRef.current = null; // 接続元をリセット
        return;
      }

      // 接続元ノードがない場合は何もしない
      const fromNodeId = connectingFromNodeIdRef.current;
      if (!fromNodeId) {
        return;
      }

      // ポインタ位置を取得（マウス／タッチ対応）
      let clientX: number;
      let clientY: number;
      if ('clientX' in event) {
        // MouseEvent
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        // TouchEvent
        const touchEvent = event as TouchEvent;
        const touch =
          (touchEvent.changedTouches && touchEvent.changedTouches[0]) ||
          (touchEvent.touches && touchEvent.touches[0]);
        // タッチ情報が取得できない場合は何もしない
        if (!touch) {
          connectingFromNodeIdRef.current = null;
          return;
        }
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      // Flow座標系に変換
      const flowPosition = screenToFlowPosition({ x: clientX, y: clientY });

      // マウス位置から最も近いノードを検出
      const allNodes = getNodesRef.current();
      const targetNode = findClosestTargetNode(
        flowPosition.x,
        flowPosition.y,
        allNodes,
        fromNodeId,
        60
      );

      // 接続元をリセット
      connectingFromNodeIdRef.current = null;

      // ターゲットノードが見つかった場合、接続を作成
      if (targetNode && targetNode.id !== fromNodeId) {
        tryStartConnection(fromNodeId, targetNode.id);
      }
    },
    [screenToFlowPosition, tryStartConnection]
  );

  // Delete/Backspaceキーでの削除前確認ハンドラ
  const handleBeforeDelete = useCallback(
    async ({ nodes: nodesToDelete, edges: edgesToDelete }: { nodes: Node[]; edges: Edge[] }) => {
      // 削除対象がない場合は削除を拒否
      if (nodesToDelete.length === 0 && edgesToDelete.length === 0) {
        return false;
      }

      // 確認メッセージを構築
      const messages: string[] = [];
      if (nodesToDelete.length > 0) {
        const count = nodesToDelete.length;
        const firstNode = nodesToDelete[0] as GraphNode;
        messages.push(
          count === 1
            ? `「${firstNode.data?.name || '不明な人物'}」を削除してもよろしいですか？`
            : `${count}個の人物を削除してもよろしいですか？`
        );
      }
      if (edgesToDelete.length > 0) {
        const count = edgesToDelete.length;
        const firstEdge = edgesToDelete[0] as RelationshipEdge;
        messages.push(
          count === 1 && firstEdge
            ? `「${firstEdge.data?.sourceToTargetLabel || '不明な関係'}」を削除してもよろしいですか？`
            : `${count}個の関係を削除してもよろしいですか？`
        );
      }

      // 確認ダイアログを表示
      const confirmed = await openConfirm({
        message: messages.join('\n'),
        isDanger: true,
      });

      return confirmed;
    },
    [openConfirm]
  );

  // ノード削除ハンドラ（確認はonBeforeDeleteで実行済み）
  const handleNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      nodesToDelete.forEach((node) => {
        removePerson(node.id);
      });
    },
    [removePerson]
  );

  // エッジ削除ハンドラ（確認はonBeforeDeleteで実行済み）
  const handleEdgesDelete = useCallback(
    (edgesToDelete: RelationshipEdge[]) => {
      edgesToDelete.forEach((edge) => {
        removeRelationship(edge.id);
      });
    },
    [removeRelationship]
  );

  // モーダルからの登録ハンドラ
  const handleRegisterPerson = useCallback(
    (name: string, croppedImageDataUrl: string | null, kind: NodeKind) => {
      if (!pendingRegistration) return;

      // 人物を追加（位置情報も渡す）
      addPerson({
        name,
        imageDataUrl: croppedImageDataUrl ?? undefined,
        kind,
        position: pendingRegistration.position,
      });

      // モーダルを閉じる
      setPendingRegistration(null);
    },
    [pendingRegistration, addPerson]
  );

  // モーダルのキャンセルハンドラ（人物登録）
  const handleCancelRegistration = useCallback(() => {
    setPendingRegistration(null);
  }, []);

  // 関係登録・更新ハンドラ（UI層のRelationshipTypeを新データモデルに変換）
  const handleRegisterRelationship = useCallback(
    (
      type: RelationshipType,
      sourceToTargetLabel: string,
      targetToSourceLabel: string | null
    ) => {
      if (!pendingConnection) return;

      // UI層のRelationshipTypeを新データモデルに変換
      const isDirected = type !== 'undirected';
      const finalSourceToTargetLabel = sourceToTargetLabel.trim();
      const finalTargetToSourceLabel =
        type === 'dual-directed'
          ? targetToSourceLabel?.trim() || null
          : type === 'bidirectional' || type === 'undirected'
            ? finalSourceToTargetLabel // 双方向・無方向は同じラベル
            : null; // one-wayは逆方向ラベルなし

      if (pendingConnection.existingRelationshipId) {
        // 編集モード: 既存の関係を更新
        updateRelationship(pendingConnection.existingRelationshipId, {
          isDirected,
          sourceToTargetLabel: finalSourceToTargetLabel,
          targetToSourceLabel: finalTargetToSourceLabel,
        });
      } else {
        // 新規登録モード: 関係を追加
        addRelationship({
          sourcePersonId: pendingConnection.sourcePersonId,
          targetPersonId: pendingConnection.targetPersonId,
          isDirected,
          sourceToTargetLabel: finalSourceToTargetLabel,
          targetToSourceLabel: finalTargetToSourceLabel,
        });
      }

      // モーダルを閉じる
      setPendingConnection(null);
    },
    [pendingConnection, addRelationship, updateRelationship]
  );

  // 関係登録のキャンセルハンドラ
  const handleCancelRelationship = useCallback(() => {
    setPendingConnection(null);
  }, []);

  // pendingConnectionの人物が削除された場合はキャンセル
  useEffect(() => {
    if (pendingConnection) {
      const sourcePerson = persons.find((p) => p.id === pendingConnection.sourcePersonId);
      const targetPerson = persons.find((p) => p.id === pendingConnection.targetPersonId);

      if (!sourcePerson || !targetPerson) {
        // どちらかの人物が削除された場合はモーダルをキャンセル
        setPendingConnection(null);
      }
    }
  }, [pendingConnection, persons]);

  return {
    // 状態
    pendingRegistration,
    pendingConnection,
    setPendingConnection, // コンテキストメニューで使用
    setPendingRegistration, // コンテキストメニューで使用
    // ハンドラ
    handleDrop,
    handleDragOver,
    handleSelectionChange,
    handleNodeClick,
    handlePaneClick,
    handleEdgeClick,
    handleConnectStart,
    handleConnect,
    handleConnectEnd,
    handleBeforeDelete,
    handleNodesDelete,
    handleEdgesDelete,
    handleRegisterPerson,
    handleCancelRegistration,
    handleRegisterRelationship,
    handleCancelRelationship,
  };
}
