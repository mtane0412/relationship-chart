/**
 * PairSelectionPanelコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { PairSelectionPanel } from './PairSelectionPanel';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';

// React Flowのモック
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useReactFlow: () => ({
      getNode: vi.fn(() => null),
      setCenter: vi.fn(),
    }),
  };
});

describe('PairSelectionPanel', () => {
  const person1: Person = {
    id: 'person-1',
    name: '山田太郎',
    imageDataUrl: undefined,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const person2: Person = {
    id: 'person-2',
    name: '佐藤花子',
    imageDataUrl: undefined,
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    // ストアをリセット
    useGraphStore.setState({
      persons: [person1, person2],
      relationships: [],
      selectedPersonIds: [person1.id, person2.id],
      forceEnabled: true,
    });
  });

  describe('UI構造', () => {
    it('フォーム上部に「2人を選択中」タイトルが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('2人を選択中')).toBeInTheDocument();
    });

    it('フォーム上部に「選択解除」ボタンが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: '選択を解除' })).toBeInTheDocument();
    });

    it('フォーム内のアバターの下に名前が表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
    });

    it('フォーム内のアバターがクリック可能である', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const person1Avatar = screen.getByRole('button', { name: '山田太郎を選択' });
      const person2Avatar = screen.getByRole('button', { name: '佐藤花子を選択' });

      expect(person1Avatar).toBeInTheDocument();
      expect(person2Avatar).toBeInTheDocument();
    });

    it('「選択解除」ボタンをクリックすると選択が解除される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const clearButton = screen.getByRole('button', { name: '選択を解除' });
      await user.click(clearButton);

      // ストアの選択が解除されたことを確認
      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.selectedPersonIds).toHaveLength(0);
      });
    });

    it('フォーム内のアバターをクリックすると単一選択に切り替わる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const person1Avatar = screen.getByRole('button', { name: '山田太郎を選択' });
      await user.click(person1Avatar);

      // ストアが単一選択に切り替わったことを確認
      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.selectedPersonIds).toEqual([person1.id]);
      });
    });
  });

  describe('既存の関係がない場合', () => {
    it('関係追加フォームが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByLabelText('関係のラベル')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument();
    });
  });

  describe('既存の関係がある場合', () => {
    beforeEach(() => {
      // 既存の双方向関係を追加
      useGraphStore.setState({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person1.id,
            targetPersonId: person2.id,
            type: 'bidirectional',
            sourceToTargetLabel: '友人',
            targetToSourceLabel: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
    });

    it('編集フォームに既存のラベルが初期値として設定される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // フォームのラベル入力に既存の値が設定されている
      const labelInput = screen.getByLabelText('関係のラベル') as HTMLInputElement;
      expect(labelInput.value).toBe('友人');
    });

    it('編集フォームが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByLabelText('関係のラベル')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
    });

    it('編集フォームで初期値が設定されている', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // ラベルが入力されている
      const labelInput = screen.getByLabelText('関係のラベル') as HTMLInputElement;
      expect(labelInput.value).toBe('友人');

      // 関係タイプ選択ボタンをクリックしてドロップダウンを開く
      const typePickerButton = screen.getByRole('button', { name: '関係タイプを選択' });
      await user.click(typePickerButton);

      // 双方向が選択されている
      await waitFor(() => {
        const bidirectionalButton = screen.getByRole('button', { name: '双方向' });
        expect(bidirectionalButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('フォームで関係を編集して更新できる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // ラベルを変更
      const labelInput = screen.getByLabelText('関係のラベル');
      await user.clear(labelInput);
      await user.type(labelInput, '親友');

      // 更新ボタンをクリック
      const updateButton = screen.getByRole('button', { name: '更新' });
      await user.click(updateButton);

      // ストアが更新されたことを確認
      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships[0].sourceToTargetLabel).toBe('親友');
      });
    });

    it('フォームで関係タイプをdual-directedに変更できる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 関係タイプ選択ボタンをクリックしてドロップダウンを開く
      const typePickerButton = screen.getByRole('button', { name: '関係タイプを選択' });
      await user.click(typePickerButton);

      // dual-directedに変更
      const dualDirectedButton = await screen.findByRole('button', { name: '片方向×2' });
      await user.click(dualDirectedButton);

      // 2つ目のラベル入力フィールドが表示される
      await waitFor(() => {
        expect(screen.getByLabelText('逆方向のラベル')).toBeInTheDocument();
      });

      // ラベルを入力
      const reverseLabelInput = screen.getByLabelText('逆方向のラベル');
      await user.type(reverseLabelInput, '同僚');

      // 更新ボタンをクリック
      const updateButton = screen.getByRole('button', { name: '更新' });
      await user.click(updateButton);

      // ストアが更新されたことを確認
      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships[0].type).toBe('dual-directed');
        expect(state.relationships[0].targetToSourceLabel).toBe('同僚');
      });
    });

    it('関係を削除できる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 削除ボタンをクリック
      const deleteButton = screen.getByRole('button', { name: 'この関係を削除' });
      await user.click(deleteButton);

      // ストアから削除されたことを確認
      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships).toHaveLength(0);
      });
    });

    it('dual-directed関係の編集時、フォームに両方のラベルが初期値として設定される', async () => {
      const user = userEvent.setup();
      // dual-directed関係を設定
      useGraphStore.setState({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person1.id,
            targetPersonId: person2.id,
            type: 'dual-directed',
            sourceToTargetLabel: '好き',
            targetToSourceLabel: '無関心',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 関係タイプ選択ボタンをクリックしてドロップダウンを開く
      const typePickerButton = screen.getByRole('button', { name: '関係タイプを選択' });
      await user.click(typePickerButton);

      // dual-directedが選択されている
      await waitFor(() => {
        const dualDirectedButton = screen.getByRole('button', { name: '片方向×2' });
        expect(dualDirectedButton).toHaveAttribute('aria-pressed', 'true');
      });

      // 両方のラベルが入力されている
      const labelInput = screen.getByLabelText('関係のラベル') as HTMLInputElement;
      expect(labelInput.value).toBe('好き');

      const reverseLabelInput = screen.getByLabelText('逆方向のラベル') as HTMLInputElement;
      expect(reverseLabelInput.value).toBe('無関心');
    });

    it('関係の向きが逆の場合でもフォームに正しいラベルが設定される', () => {
      // person2 → person1 の関係を設定
      useGraphStore.setState({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person2.id, // person2が起点
            targetPersonId: person1.id, // person1が終点
            type: 'one-way',
            sourceToTargetLabel: '上司',
            targetToSourceLabel: null,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // フォームのラベル入力に正しい値が設定されている
      const labelInput = screen.getByLabelText('関係のラベル') as HTMLInputElement;
      expect(labelInput.value).toBe('上司');
    });
  });
});
