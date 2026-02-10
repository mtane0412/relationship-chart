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
    it('閉じている状態では検索ボタンのみ表示する', () => {
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // 検索ボタンが表示される
      const button = screen.getByRole('button', { name: /検索/i });
      expect(button).toBeInTheDocument();

      // 検索入力フィールドは表示されない
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('開閉操作', () => {
    it('検索ボタンをクリックすると検索ウィンドウが開く', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const button = screen.getByRole('button', { name: /検索/i });
      await user.click(button);

      // 検索入力フィールドが表示される
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
      expect(combobox).toHaveFocus();
    });

    it('Escapeキーで検索ウィンドウが閉じる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // 検索ウィンドウを開く
      const button = screen.getByRole('button', { name: /検索/i });
      await user.click(button);

      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();

      // Escapeキーで閉じる
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      });
    });
  });

  describe('キーボードショートカット', () => {
    it('Cmd+Kで検索ウィンドウが開く（Mac）', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // Cmd+K
      await user.keyboard('{Meta>}k{/Meta}');

      await waitFor(() => {
        const combobox = screen.getByRole('combobox');
        expect(combobox).toBeInTheDocument();
        expect(combobox).toHaveFocus();
      });
    });

    it('Ctrl+Kで検索ウィンドウが開く（Windows/Linux）', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // Ctrl+K
      await user.keyboard('{Control>}k{/Control}');

      await waitFor(() => {
        const combobox = screen.getByRole('combobox');
        expect(combobox).toBeInTheDocument();
        expect(combobox).toHaveFocus();
      });
    });

    it('開いている状態でCmd+Kを押すと閉じる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // 開く
      await user.keyboard('{Meta>}k{/Meta}');
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      // もう一度押すと閉じる
      await user.keyboard('{Meta>}k{/Meta}');
      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
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

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

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

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

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

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '存在しない名前');

      await waitFor(() => {
        expect(screen.getByText(/一致する結果がありません/i)).toBeInTheDocument();
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

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

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

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

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
    it('人物をクリックすると選択される', async () => {
      const user = userEvent.setup();
      const selectPerson = vi.fn();
      useGraphStore.setState({ selectPerson });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '山田');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /山田太郎/i });
        expect(option).toBeInTheDocument();
      });

      const option = screen.getByRole('option', { name: /山田太郎/i });
      await user.click(option);

      // selectPersonが呼ばれることを確認
      expect(selectPerson).toHaveBeenCalledWith('person1');

      // 検索ウィンドウが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
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

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

      const combobox = screen.getByRole('combobox');
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

      // 検索ウィンドウが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      });
    });

    it('関係を選択すると両端の人物が選択される', async () => {
      const user = userEvent.setup();
      const setSelectedPersonIds = vi.fn();
      useGraphStore.setState({ setSelectedPersonIds });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      // 検索ウィンドウを開く
      await user.keyboard('{Meta>}k{/Meta}');

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '上司');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /上司/i });
        expect(option).toBeInTheDocument();
      });

      const option = screen.getByRole('option', { name: /上司/i });
      await user.click(option);

      // setSelectedPersonIdsが呼ばれることを確認
      expect(setSelectedPersonIds).toHaveBeenCalledWith(['person1', 'person2']);

      // 検索ウィンドウが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      });
    });
  });
});
