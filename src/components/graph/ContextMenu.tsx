/**
 * コンテキストメニューコンポーネント
 *
 * ノード・エッジ・背景の右クリックに表示されるメニューです。
 * キーボードナビゲーション（Arrow/Home/End/Enter/Escape）に対応しています。
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

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
  /** 検索フィルター対象の項目かどうか（デフォルト: false） */
  filterable?: boolean;
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
  /** 検索フィルターのプレースホルダー（デフォルト: '名前で絞り込み...'） */
  filterPlaceholder?: string;
};

/**
 * コンテキストメニューコンポーネント
 */
export function ContextMenu({
  items,
  position,
  onClose,
  filterPlaceholder = '名前で絞り込み...',
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const focusedIndexRef = useRef<number>(0);

  const [filterQuery, setFilterQuery] = useState(''); // フィルタリングに使用する確定された値
  const [inputValue, setInputValue] = useState(''); // 入力フィールドの表示値
  const [isComposing, setIsComposing] = useState(false);

  // filterable項目が存在するかどうか
  const hasFilterableItems = items.some((item) => item.filterable);

  // フィルタリング処理
  const filteredItems = items.map((item) => {
    // filterable項目以外はそのまま表示
    if (!item.filterable) {
      return item;
    }

    // 検索クエリがない場合はすべて表示
    if (!filterQuery.trim()) {
      return item;
    }

    // 部分一致（大文字小文字無視）でフィルタリング
    const normalizedLabel = item.label.toLowerCase();
    const normalizedQuery = filterQuery.toLowerCase();

    if (normalizedLabel.includes(normalizedQuery)) {
      return item;
    }

    // フィルタリングで除外
    return null;
  }).filter((item): item is ContextMenuItem => item !== null);

  // フィルタリング後のfilterable項目数
  const filteredFilterableCount = filteredItems.filter(
    (item) => item.filterable
  ).length;

  // セパレーター以外の項目のみを対象にする
  const interactiveItems = filteredItems.filter((item) => !item.separator);

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
      // IME変換中のEnterキーは無視
      if (event.key === 'Enter' && isComposing) {
        return;
      }

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowDown':
          event.preventDefault();
          // 検索入力がフォーカスされている場合は最初のリスト項目へ
          if (
            hasFilterableItems &&
            document.activeElement === filterInputRef.current
          ) {
            focusFirstItem();
          } else {
            focusNextItem();
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          // 最初のリスト項目がフォーカスされている場合は検索入力へ戻る
          if (
            hasFilterableItems &&
            focusedIndexRef.current === 0 &&
            filterInputRef.current
          ) {
            filterInputRef.current.focus();
          } else {
            focusPreviousItem();
          }
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
          // 検索入力がフォーカスされている場合はメニューを閉じる
          if (
            hasFilterableItems &&
            document.activeElement === filterInputRef.current
          ) {
            onClose();
          } else {
            // フォーカス中の項目を実行
            itemRefs.current[focusedIndexRef.current]?.click();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onClose,
    focusNextItem,
    focusPreviousItem,
    focusFirstItem,
    focusLastItem,
    hasFilterableItems,
    isComposing,
  ]);

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
   * マウント時のフォーカス制御
   * filterable項目がある場合は検索入力にフォーカス、ない場合は最初のメニュー項目にフォーカス
   */
  useEffect(() => {
    if (hasFilterableItems && filterInputRef.current) {
      filterInputRef.current.focus();
    } else {
      focusFirstItem();
    }
  }, [focusFirstItem, hasFilterableItems]);

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
      className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg min-w-[200px] max-h-[400px] overflow-y-auto"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* 検索入力フィールド（filterable項目がある場合は常に最上部に表示） */}
      {hasFilterableItems && (
        <div className="px-2 py-2 border-b border-gray-200">
          <input
            ref={filterInputRef}
            type="text"
            placeholder={filterPlaceholder}
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setInputValue(newValue);

              // IME変換中はフィルタリングを実行しない
              const isComposingNow = (e.nativeEvent as InputEvent).isComposing;
              if (!isComposingNow) {
                setFilterQuery(newValue);
              }
            }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              // IME変換確定時にフィルタリングを実行
              const finalValue = (e.target as HTMLInputElement).value;
              setFilterQuery(finalValue);
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {filteredItems.map((item, index) => {
        // セパレーターの場合
        if (item.separator) {
          return <div key={`separator-${index}`} className="border-t border-gray-200 my-1" />;
        }

        // 通常のメニュー項目
        const currentInteractiveIndex = interactiveItemIndex;
        interactiveItemIndex++;

        const Icon = item.icon;

        return (
          <button
            key={`item-${index}`}
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
            onFocus={() => {
              focusedIndexRef.current = currentInteractiveIndex;
            }}
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

      {/* フィルタリング結果が0件の場合のメッセージ */}
      {hasFilterableItems &&
        filterQuery.trim() &&
        filteredFilterableCount === 0 && (
          <div className="px-3 py-2 text-sm text-gray-500 text-center">
            一致する人物がいません
          </div>
        )}
    </div>
  );
}
