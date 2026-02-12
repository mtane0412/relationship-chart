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
import {
  VIEWPORT_ANIMATION_DURATION,
  VIEWPORT_FIT_PADDING,
  VIEWPORT_MAX_ZOOM,
} from '@/lib/viewport-utils';

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
      fitView: vi.fn(),
    })),
  };
});

// 動的importのため型をimport
import { useReactFlow } from '@xyflow/react';

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
      // プレースホルダーはプラットフォームに応じて表示される
      const placeholder = combobox.getAttribute('placeholder');
      expect(placeholder).toMatch(/^(⌘K|Ctrl\+K)$/);
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

    it('画像がない人物ノードにはUserアイコンが表示される', async () => {
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

        // アイコンコンテナが表示されることを確認
        const iconContainer = option.querySelector('div.rounded-full');
        expect(iconContainer).toBeInTheDocument();
      });
    });

    it('画像がある人物ノードには画像が表示される', async () => {
      const user = userEvent.setup();

      // 画像付き人物を追加
      const personWithImage: Person = {
        id: 'person-with-image',
        name: '画像付き太郎',
        imageDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
        createdAt: '2024-01-03T00:00:00Z',
      };

      useGraphStore.setState({
        persons: [personWithImage],
        relationships: [],
      });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '画像付き');

      await waitFor(() => {
        const option = screen.getByRole('option', { name: /画像付き太郎/i });
        expect(option).toBeInTheDocument();

        // 画像が表示されることを確認
        const img = option.querySelector('img[alt="画像付き太郎"]');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=');
      });
    });

    it('物ノードには角丸正方形のアイコンが表示される', async () => {
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

        // 角丸正方形（rounded）のアイコンコンテナが表示されることを確認
        const iconContainer = option.querySelector('div.rounded');
        expect(iconContainer).toBeInTheDocument();
        // 円形（rounded-full）ではないことを確認
        const circleContainer = option.querySelector('div.rounded-full');
        expect(circleContainer).not.toBeInTheDocument();
      });
    });

    it('関係には2つのノード画像と関係アイコンが表示される', async () => {
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

        // 2つのノードアイコン（画像なしの場合はUserアイコン）が表示されることを確認
        const iconContainers = option.querySelectorAll('div.rounded-full');
        expect(iconContainers.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('キーボードナビゲーション', () => {
    it('検索結果が表示されたら最初の候補が自動的に選択される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox');
      await user.type(combobox, '山田');

      await waitFor(() => {
        const firstOption = screen.getByRole('option', { name: /山田太郎/i });
        expect(firstOption).toBeInTheDocument();
        // 最初の候補が自動的に選択される
        expect(firstOption).toHaveAttribute('aria-selected', 'true');
      });
    });

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
        const secondOption = screen.getByRole('option', { name: /田中花子/i });
        expect(secondOption).toHaveAttribute('aria-selected', 'true');
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

  describe('日本語入力', () => {
    it('IME変換中のEnterキーは無視される', async () => {
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

      // IME変換中のEnterキーイベントをシミュレート
      const composingEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        isComposing: true,
      });

      combobox.dispatchEvent(composingEnterEvent);

      // selectPersonが呼ばれないことを確認
      expect(selectPerson).not.toHaveBeenCalled();

      // 検索クエリもクリアされないことを確認
      expect(combobox.value).toBe('山田');
    });

    it('IME変換確定後のEnterキーで選択できる', async () => {
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

      // IME変換確定後のEnterキーイベントをシミュレート
      const normalEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
        isComposing: false,
      });

      combobox.dispatchEvent(normalEnterEvent);

      // selectPersonが呼ばれることを確認
      await waitFor(() => {
        expect(selectPerson).toHaveBeenCalledWith('person1');
      });
    });

    it('IME変換中のCmd+Kは無視される', async () => {
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
      expect(combobox).not.toHaveFocus();

      // IME変換中のCmd+Kイベントをシミュレート
      const composingCmdKEvent = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
        cancelable: true,
        isComposing: true,
      });

      window.dispatchEvent(composingCmdKEvent);

      // フォーカスされないことを確認（IME変換中は無視される）
      expect(combobox).not.toHaveFocus();
    });

    it('IME変換確定後のCmd+Kで検索入力フィールドにフォーカスする', async () => {
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
      expect(combobox).not.toHaveFocus();

      // IME変換確定後のCmd+Kイベントをシミュレート
      const normalCmdKEvent = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
        cancelable: true,
        isComposing: false,
      });

      window.dispatchEvent(normalCmdKEvent);

      await waitFor(() => {
        // フォーカスされることを確認
        expect(combobox).toHaveFocus();
        // 全選択されていることを確認
        expect(combobox.selectionStart).toBe(0);
        expect(combobox.selectionEnd).toBe(combobox.value.length);
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

    it('Enterキーで自動選択された最初の候補を選択できる', async () => {
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

      // ArrowDownを押さずに、Enterだけで確定
      await user.keyboard('{Enter}');

      // selectPersonが呼ばれることを確認
      expect(selectPerson).toHaveBeenCalledWith('person1');

      // 検索クエリがクリアされることを確認
      await waitFor(() => {
        expect(combobox.value).toBe('');
      });
    });

    it('ArrowDownで次の結果に移動してからEnterで選択できる', async () => {
      const user = userEvent.setup();
      const selectPerson = vi.fn();
      useGraphStore.setState({ selectPerson });

      render(
        <ReactFlowProvider>
          <SearchBar />
        </ReactFlowProvider>
      );

      const combobox = screen.getByRole('combobox') as HTMLInputElement;
      await user.type(combobox, '田');

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /山田太郎/i })).toBeInTheDocument();
      });

      // ArrowDownで2番目の結果へ移動
      await user.keyboard('{ArrowDown}');

      // Enterで確定
      await user.keyboard('{Enter}');

      // selectPersonが呼ばれることを確認（2番目の結果）
      expect(selectPerson).toHaveBeenCalledWith('person2');

      // 検索クエリがクリアされることを確認
      await waitFor(() => {
        expect(combobox.value).toBe('');
      });
    });

    it('関係を選択すると両端の人物が選択され、検索クエリがクリアされる', async () => {
      const user = userEvent.setup();
      const setSelectedPersonIds = vi.fn();
      const mockFitView = vi.fn();
      useGraphStore.setState({ setSelectedPersonIds });

      // useReactFlowモックにfitViewを追加
      vi.mocked(useReactFlow).mockReturnValue({
        getNode: vi.fn((id: string) => ({
          id,
          position: { x: 100, y: 100 },
          data: {},
          measured: { width: 80, height: 120 },
        })),
        setCenter: vi.fn(),
        fitView: mockFitView,
      } as unknown as ReturnType<typeof useReactFlow>);

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

      // fitViewが正しいパラメータで呼ばれることを確認
      expect(mockFitView).toHaveBeenCalledWith({
        nodes: [{ id: 'person1' }, { id: 'person2' }],
        padding: VIEWPORT_FIT_PADDING,
        maxZoom: VIEWPORT_MAX_ZOOM,
        duration: VIEWPORT_ANIMATION_DURATION,
      });

      // 検索クエリがクリアされることを確認
      await waitFor(() => {
        expect(combobox.value).toBe('');
      });
    });
  });
});
