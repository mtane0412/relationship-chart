/**
 * ContextMenuコンポーネントのテスト
 *
 * コンテキストメニューの表示・操作・キーボードナビゲーションが正しく動作することを検証します。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';
import { UserPlus, Trash2 } from 'lucide-react';

describe('ContextMenu', () => {
  const mockOnClose = vi.fn();

  const defaultItems = [
    {
      label: '追加',
      icon: UserPlus,
      onClick: vi.fn(),
    },
    {
      label: '削除',
      icon: Trash2,
      onClick: vi.fn(),
      danger: true,
    },
  ];

  const defaultPosition = { x: 100, y: 200 };

  beforeEach(() => {
    mockOnClose.mockClear();
    for (const item of defaultItems) {
      (item.onClick as ReturnType<typeof vi.fn>).mockClear();
    }
  });

  it('指定された位置にメニューを表示する', () => {
    const { container } = render(
      <ContextMenu
        items={defaultItems}
        position={defaultPosition}
        onClose={mockOnClose}
      />
    );

    const menu = container.querySelector('[role="menu"]');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveStyle({
      left: '100px',
      top: '200px',
    });
  });

  it('すべてのメニュー項目を表示する', () => {
    render(
      <ContextMenu
        items={defaultItems}
        position={defaultPosition}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('追加')).toBeInTheDocument();
    expect(screen.getByText('削除')).toBeInTheDocument();
  });

  it('危険アイテムに適切なクラスを適用する', () => {
    render(
      <ContextMenu
        items={defaultItems}
        position={defaultPosition}
        onClose={mockOnClose}
      />
    );

    const deleteButton = screen.getByText('削除').closest('button');
    expect(deleteButton).toHaveClass('text-red-600');
  });

  it('セパレーターを表示する', () => {
    const itemsWithSeparator = [
      ...defaultItems,
      { label: '', separator: true, onClick: vi.fn() },
      { label: '他の操作', onClick: vi.fn() },
    ];

    const { container } = render(
      <ContextMenu
        items={itemsWithSeparator}
        position={defaultPosition}
        onClose={mockOnClose}
      />
    );

    const separators = container.querySelectorAll('.border-t');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('メニュー項目クリック時にonClickとonCloseが呼ばれる', () => {
    render(
      <ContextMenu
        items={defaultItems}
        position={defaultPosition}
        onClose={mockOnClose}
      />
    );

    const addButton = screen.getByText('追加');
    fireEvent.click(addButton);

    expect(defaultItems[0].onClick).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('メニュー外クリック時にonCloseが呼ばれる', () => {
    render(
      <ContextMenu
        items={defaultItems}
        position={defaultPosition}
        onClose={mockOnClose}
      />
    );

    // documentにmousedownイベントを発火
    fireEvent.mouseDown(document);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('メニュー内クリック時はonCloseが呼ばれない（イベント伝播を防ぐ）', () => {
    const { container } = render(
      <ContextMenu
        items={defaultItems}
        position={defaultPosition}
        onClose={mockOnClose}
      />
    );

    const menu = container.querySelector('[role="menu"]');
    if (menu) {
      fireEvent.mouseDown(menu);
    }

    // メニュー項目のクリック以外では閉じない
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  describe('キーボード操作', () => {
    it('Escapeキーでメニューを閉じる', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('ArrowDownで次の項目にフォーカス移動する', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');
      const secondItem = screen.getByText('削除').closest('button');

      // 最初の項目が自動フォーカスされる
      expect(firstItem).toHaveFocus();

      // ArrowDownで次の項目へ
      fireEvent.keyDown(firstItem!, { key: 'ArrowDown' });
      expect(secondItem).toHaveFocus();
    });

    it('ArrowUpで前の項目にフォーカス移動する', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');
      const secondItem = screen.getByText('削除').closest('button');

      // 最初の項目が自動フォーカスされる
      expect(firstItem).toHaveFocus();

      // ArrowDownで2番目へ移動
      fireEvent.keyDown(firstItem!, { key: 'ArrowDown' });
      expect(secondItem).toHaveFocus();

      // ArrowUpで1番目に戻る
      fireEvent.keyDown(secondItem!, { key: 'ArrowUp' });
      expect(firstItem).toHaveFocus();
    });

    it('Homeキーで最初の項目にフォーカス移動する', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');
      const secondItem = screen.getByText('削除').closest('button');

      // 2番目の項目にフォーカスを移動
      fireEvent.keyDown(firstItem!, { key: 'ArrowDown' });
      expect(secondItem).toHaveFocus();

      // Homeで最初に戻る
      fireEvent.keyDown(secondItem!, { key: 'Home' });
      expect(firstItem).toHaveFocus();
    });

    it('Endキーで最後の項目にフォーカス移動する', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');
      const secondItem = screen.getByText('削除').closest('button');

      // 最初の項目が自動フォーカスされる
      expect(firstItem).toHaveFocus();

      // Endで最後に移動
      fireEvent.keyDown(firstItem!, { key: 'End' });
      expect(secondItem).toHaveFocus();
    });

    it('Enterキーで選択中の項目を実行する', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');

      // Enterキーで実行
      fireEvent.keyDown(firstItem!, { key: 'Enter' });

      expect(defaultItems[0].onClick).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('最後の項目でArrowDownを押すと最初の項目に戻る（循環）', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');
      const secondItem = screen.getByText('削除').closest('button');

      // 最後の項目に移動
      fireEvent.keyDown(firstItem!, { key: 'End' });
      expect(secondItem).toHaveFocus();

      // ArrowDownで最初に戻る
      fireEvent.keyDown(secondItem!, { key: 'ArrowDown' });
      expect(firstItem).toHaveFocus();
    });

    it('最初の項目でArrowUpを押すと最後の項目に移動する（循環）', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');
      const secondItem = screen.getByText('削除').closest('button');

      // 最初の項目が自動フォーカスされる
      expect(firstItem).toHaveFocus();

      // ArrowUpで最後に移動
      fireEvent.keyDown(firstItem!, { key: 'ArrowUp' });
      expect(secondItem).toHaveFocus();
    });
  });

  describe('アクセシビリティ', () => {
    it('role="menu"とrole="menuitem"を持つ', () => {
      const { container } = render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const menu = container.querySelector('[role="menu"]');
      const menuItems = container.querySelectorAll('[role="menuitem"]');

      expect(menu).toBeInTheDocument();
      expect(menuItems.length).toBe(defaultItems.length);
    });

    it('マウント時に最初のメニュー項目にフォーカスが当たる', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const firstItem = screen.getByText('追加').closest('button');
      expect(firstItem).toHaveFocus();
    });
  });
});
