/**
 * SearchBarコンポーネントのテスト
 * キーボード操作、検索、結果選択の振る舞いを検証
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import SearchBar from './SearchBar';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

// React Flowのモック
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useReactFlow: vi.fn(() => ({
      getNode: vi.fn((id: string) => ({
        id,
        position: { x: 100, y: 100 },
        data: {},
        measured: { width: 80, height: 120 },
      })),
      setCenter: vi.fn(),
    })),
  };
});

describe('SearchBar', () => {
  // テスト用データ
  const testPersons: Person[] = [
    {
      id: 'person1',
      name: '山田太郎',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'person2',
      name: '田中花子',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const testRelationships: Relationship[] = [
    {
      id: 'rel1',
      sourcePersonId: 'person1',
      targetPersonId: 'person2',
      isDirected: true,
      sourceToTargetLabel: '上司',
      targetToSourceLabel: '部下',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    // ストアをリセット
    useGraphStore.setState({
      persons: testPersons,
      relationships: testRelationships,
      selectedPersonIds: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('初期表示', () => {
    it('検索入力フィールドが常時表示される', () => {
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // 検索入力フィールドが表示される
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
      expect(combobox).toHaveAttribute('placeholder', '⌘K');
    });
  });

  describe('フォーカス操作', () => {
    it('Escapeキーで検索クエリがクリアされる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox') as HTMLInputElement;

      // 検索クエリを入力
      await user.type(combobox, '山田');
      expect(combobox.value).toBe('山田');

      // Escapeキーでクリア
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(combobox.value).toBe('');
      });
    });
  });

  describe('キーボードショートカット', () => {
    it('Cmd+Kで検索入力フィールドにフォーカスして全選択（Mac）', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox') as HTMLInputElement;

      // 事前に入力しておく
      await user.type(combobox, 'テスト');
      expect(combobox.value).toBe('テスト');

      // フォーカスを外す
      combobox.blur();

      // Cmd+K
      await user.keyboard('{Meta>}k{/Meta}');

      await waitFor(() => {
        expect(combobox).toHaveFocus();
        // 全選択されていることを確認（selectionStart === 0 && selectionEnd === value.length）
        expect(combobox.selectionStart).toBe(0);
        expect(combobox.selectionEnd).toBe(combobox.value.length);
      });
    });

    it('Ctrl+Kで検索入力フィールドにフォーカスして全選択（Windows/Linux）', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox') as HTMLInputElement;

      // 事前に入力しておく
      await user.type(combobox, 'テスト');
      expect(combobox.value).toBe('テスト');

      // フォーカスを外す
      combobox.blur();

      // Ctrl+K
      await user.keyboard('{Control>}k{/Control}');

      await waitFor(() => {
        expect(combobox).toHaveFocus();
        expect(combobox.selectionStart).toBe(0);
        expect(combobox.selectionEnd).toBe(combobox.value.length);
      });
    });
  });

  describe('検索機能', () => {
    it('人物名を検索すると結果が表示される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '山田');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /山田太郎/i });
        expect(option).toBeInTheDocument();
      });
    });

    it('関係ラベルを検索すると結果が表示される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '上司');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /上司/i });
        expect(option).toBeInTheDocument();
      });
    });

    it('一致する結果がない場合はメッセージを表示する', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '存在しない名前');

      await waitFor(() => {
        expect(screen.getByText(/一致する結果がありません/i)).toBeInTheDocument();
      });
    });

    it('物ノードには「物」というラベルが表示される', async () => {
      const user = userEvent.setup();

      // 物ノードを追加
      const itemPerson: Person = {
        id: 'item1',
        name: 'テストアイテム',
        kind: 'item',
        createdAt: '2024-01-03T00:00:00Z',
      };

      useGraphStore.setState({
        persons: [itemPerson],
        relationships: [],
      });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, 'テストアイテム');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /テストアイテム/i });
        expect(option).toBeInTheDocument();

        // 「物」ラベルが表示されることを確認
        expect(option).toHaveTextContent('物');
      });
    });
  });

  describe('キーボードナビゲーション', () => {
    it('ArrowDownで次の結果にフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '田');

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /山田太郎/i })).toBeInTheDocument();
      });

      // ArrowDownで次の結果へ
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        const firstOption = screen.getByRole('option', { name: /山田太郎/i });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('ArrowUpで前の結果にフォーカスが移動する', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '田');

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /山田太郎/i })).toBeInTheDocument();
      });

      // ArrowDownで2番目へ移動
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // ArrowUpで1番目へ戻る
      await user.keyboard('{ArrowUp}');

      await waitFor(() => {
        const firstOption = screen.getByRole('option', { name: /山田太郎/i });
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  describe('結果選択', () => {
    it('人物をクリックすると選択され、検索クエリがクリアされる', async () => {
      const user = userEvent.setup();
      const selectPerson = vi.fn();
      useGraphStore.setState({ selectPerson });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox') as HTMLInputElement;
      await user.type(combobox, '山田');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /山田太郎/i });
        expect(option).toBeInTheDocument();
      });

      const option = screen.getByRole('option', { name: /山田太郎/i });
      await user.click(option);

      // selectPersonが呼ばれることを確認
      expect(selectPerson).toHaveBeenCalledWith('person1');

      // 検索クエリがクリアされることを確認
      await waitFor(() => {
        expect(combobox.value).toBe('');
      });
    });

    it('Enterキーで選択中の結果を選択できる', async () => {
      const user = userEvent.setup();
      const selectPerson = vi.fn();
      useGraphStore.setState({ selectPerson });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox') as HTMLInputElement;
      await user.type(combobox, '山田');

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /山田太郎/i })).toBeInTheDocument();
      });

      // ArrowDownで選択
      await user.keyboard('{ArrowDown}');

      // Enterで確定
      await user.keyboard('{Enter}');

      // selectPersonが呼ばれることを確認
      expect(selectPerson).toHaveBeenCalledWith('person1');

      // 検索クエリがクリアされることを確認
      await waitFor(() => {
        expect(combobox.value).toBe('');
      });
    });

    it('関係を選択すると両端の人物が選択され、検索クエリがクリアされる', async () => {
      const user = userEvent.setup();
      const setSelectedPersonIds = vi.fn();
      useGraphStore.setState({ setSelectedPersonIds });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox') as HTMLInputElement;
      await user.type(combobox, '上司');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /上司/i });
        expect(option).toBeInTheDocument();
      });

      const option = screen.getByRole('option', { name: /上司/i });
      await user.click(option);

      // setSelectedPersonIdsが呼ばれることを確認
      expect(setSelectedPersonIds).toHaveBeenCalledWith(['person1', 'person2']);

      // 検索クエリがクリアされることを確認
      await waitFor(() => {
        expect(combobox.value).toBe('');
      });
    });
  });
});
