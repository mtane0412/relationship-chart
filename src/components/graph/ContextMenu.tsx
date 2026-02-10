/**
 * コンテキストメニューコンポーネント
 *
 * ノード・エッジ・背景の右クリックに表示されるメニューです。
 * キーボードナビゲーション（Arrow/Home/End/Enter/Escape）に対応しています。
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * メニュー項目の型定義
 */
export type ContextMenuItem = {
  /** 表示ラベル */
  label: string;
  /** アイコンコンポーネント（lucide-reactなど） */
  icon?: React.ComponentType<{ className?: string }>;
  /** 画像URL（人物アイコンなど） */
  imageUrl?: string;
  /** クリック時のアクション */
  onClick: () => void;
  /** 危険な操作（削除など）の場合はtrue */
  danger?: boolean;
  /** セパレーター（区切り線）の場合はtrue */
  separator?: boolean;
  /** クリック後にメニューを閉じるかどうか（デフォルト: true） */
  closeOnClick?: boolean;
};

/**
 * コンテキストメニューのProps
 */
type ContextMenuProps = {
  /** メニュー項目のリスト */
  items: ContextMenuItem[];
  /** メニューの表示位置（スクリーン座標） */
  position: { x: number; y: number };
  /** メニューを閉じるコールバック */
  onClose: () => void;
};

/**
 * コンテキストメニューコンポーネント
 */
export function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusedIndexRef = useRef<number>(0);

  // セパレーター以外の項目のみを対象にする
  const interactiveItems = items.filter((item) => !item.separator);

  /**
   * 次の項目にフォーカスを移動
   */
  const focusNextItem = useCallback(() => {
    const nextIndex = (focusedIndexRef.current + 1) % interactiveItems.length;
    itemRefs.current[nextIndex]?.focus();
    focusedIndexRef.current = nextIndex;
  }, [interactiveItems.length]);

  /**
   * 前の項目にフォーカスを移動
   */
  const focusPreviousItem = useCallback(() => {
    const prevIndex =
      (focusedIndexRef.current - 1 + interactiveItems.length) %
      interactiveItems.length;
    itemRefs.current[prevIndex]?.focus();
    focusedIndexRef.current = prevIndex;
  }, [interactiveItems.length]);

  /**
   * 最初の項目にフォーカスを移動
   */
  const focusFirstItem = useCallback(() => {
    itemRefs.current[0]?.focus();
    focusedIndexRef.current = 0;
  }, []);

  /**
   * 最後の項目にフォーカスを移動
   */
  const focusLastItem = useCallback(() => {
    const lastIndex = interactiveItems.length - 1;
    itemRefs.current[lastIndex]?.focus();
    focusedIndexRef.current = lastIndex;
  }, [interactiveItems.length]);

  /**
   * キーボードイベントハンドラ
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          event.preventDefault();
          focusNextItem();
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusPreviousItem();
          break;
        case 'Home':
          event.preventDefault();
          focusFirstItem();
          break;
        case 'End':
          event.preventDefault();
          focusLastItem();
          break;
        case 'Enter':
          event.preventDefault();
          // フォーカス中の項目を実行
          itemRefs.current[focusedIndexRef.current]?.click();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, focusNextItem, focusPreviousItem, focusFirstItem, focusLastItem]);

  /**
   * メニュー外クリックでメニューを閉じる
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  /**
   * マウント時に最初の項目にフォーカス
   */
  useEffect(() => {
    focusFirstItem();
  }, [focusFirstItem]);

  /**
   * メニュー項目クリックハンドラ
   */
  const handleItemClick = (item: ContextMenuItem) => {
    item.onClick();
    // closeOnClickがfalseの場合はメニューを閉じない（デフォルトはtrue）
    if (item.closeOnClick !== false) {
      onClose();
    }
  };

  let interactiveItemIndex = 0;

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg min-w-[200px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {items.map((item, index) => {
        // セパレーターの場合
        if (item.separator) {
          return <div key={index} className="border-t border-gray-200 my-1" />;
        }

        // 通常のメニュー項目
        const currentInteractiveIndex = interactiveItemIndex;
        interactiveItemIndex++;

        const Icon = item.icon;

        return (
          <button
            key={index}
            ref={(el) => {
              itemRefs.current[currentInteractiveIndex] = el;
            }}
            role="menuitem"
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
              item.danger
                ? 'text-red-600 hover:bg-red-50'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => handleItemClick(item)}
          >
            {/* 画像がある場合は画像を表示 */}
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              Icon && <Icon className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
