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

  describe('検索フィルター', () => {
    const filterableItems = [
      {
        label: '戻る',
        onClick: vi.fn(),
      },
      {
        label: '',
        separator: true,
        onClick: vi.fn(),
      },
      {
        label: '山田太郎',
        filterable: true,
        onClick: vi.fn(),
      },
      {
        label: '鈴木花子',
        filterable: true,
        onClick: vi.fn(),
      },
      {
        label: 'John Smith',
        filterable: true,
        onClick: vi.fn(),
      },
    ];

    beforeEach(() => {
      for (const item of filterableItems) {
        (item.onClick as ReturnType<typeof vi.fn>).mockClear();
      }
    });

    it('filterable項目がある場合に検索入力フィールドが表示される', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      expect(searchInput).toBeInTheDocument();
    });

    it('filterable項目がない場合は検索入力フィールドが表示されない', () => {
      render(
        <ContextMenu
          items={defaultItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.queryByPlaceholderText('名前で絞り込み...');
      expect(searchInput).not.toBeInTheDocument();
    });

    it('検索文字列でfilterable項目のみがフィルタリングされる', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      fireEvent.change(searchInput, { target: { value: '山田' } });

      // 「戻る」は常に表示される
      expect(screen.getByText('戻る')).toBeInTheDocument();
      // 「山田太郎」のみ表示される
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      // 他は表示されない
      expect(screen.queryByText('鈴木花子')).not.toBeInTheDocument();
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });

    it('大文字小文字を区別せずにフィルタリングする', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      // 小文字で検索
      fireEvent.change(searchInput, { target: { value: 'john' } });

      // 「John Smith」が表示される（大文字小文字を区別しない）
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      // 他は表示されない
      expect(screen.queryByText('山田太郎')).not.toBeInTheDocument();
      expect(screen.queryByText('鈴木花子')).not.toBeInTheDocument();
    });

    it('フィルタリング結果が0件の場合「一致する人物がいません」を表示', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      fireEvent.change(searchInput, { target: { value: '存在しない名前' } });

      expect(screen.getByText('一致する人物がいません')).toBeInTheDocument();
      // 「戻る」は常に表示される
      expect(screen.getByText('戻る')).toBeInTheDocument();
    });

    it('filterable項目がある場合は検索入力に自動フォーカス', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      expect(searchInput).toHaveFocus();
    });

    it('検索入力からArrowDownでリスト項目へフォーカス移動', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      expect(searchInput).toHaveFocus();

      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      const firstItem = screen.getByText('戻る').closest('button');
      expect(firstItem).toHaveFocus();
    });

    it('リスト最上部からArrowUpで検索入力へ戻る', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

      const firstItem = screen.getByText('戻る').closest('button');
      expect(firstItem).toHaveFocus();

      fireEvent.keyDown(firstItem!, { key: 'ArrowUp' });
      expect(searchInput).toHaveFocus();
    });

    it('検索入力でEscapeを押すとメニューを閉じる', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');
      fireEvent.keyDown(searchInput, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('filterPlaceholderが反映される', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
          filterPlaceholder="カスタムプレースホルダー"
        />
      );

      const searchInput = screen.getByPlaceholderText('カスタムプレースホルダー');
      expect(searchInput).toBeInTheDocument();
    });

    it('IME変換中（isComposing）のEnterキーは無視される', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText('名前で絞り込み...');

      // IME変換開始
      fireEvent.compositionStart(searchInput);

      // Enter押下（変換確定）
      fireEvent.keyDown(searchInput, { key: 'Enter', isComposing: true });

      // メニューは閉じない
      expect(mockOnClose).not.toHaveBeenCalled();

      // IME変換終了
      fireEvent.compositionEnd(searchInput);

      // 通常のEnter押下
      fireEvent.keyDown(searchInput, { key: 'Enter', isComposing: false });

      // メニューが閉じる
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('通常の入力でフィルタリングが動作する', () => {
      render(
        <ContextMenu
          items={filterableItems}
          position={defaultPosition}
          onClose={mockOnClose}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        '名前で絞り込み...'
      ) as HTMLInputElement;

      // 通常の入力（英字）でフィルタリングが動作することを確認
      fireEvent.change(searchInput, { target: { value: 'john' } });

      // 「John Smith」のみ表示される
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('山田太郎')).not.toBeInTheDocument();

      // 入力をクリア
      fireEvent.change(searchInput, { target: { value: '' } });

      // 全員表示される
      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('鈴木花子')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });
});
