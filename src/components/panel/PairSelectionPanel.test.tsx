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

    it('関係タイプ選択ドロップダウンが外部クリックで閉じる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // ドロップダウンを開く
      const typePickerButton = screen.getByRole('button', { name: '関係タイプを選択' });
      await user.click(typePickerButton);

      // ドロップダウンが表示されることを確認
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '片方向' })).toBeInTheDocument();
      });

      // フォーム外をクリック（document.bodyをクリック）
      await user.click(document.body);

      // ドロップダウンが閉じることを確認
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '片方向' })).not.toBeInTheDocument();
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
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            forward: { label: '友人', affection: null, awareness: null, role: null },
            reverse: { label: '友人', affection: null, awareness: null, role: null },
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
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
        expect(state.relationships[0].forward.label).toBe('親友');
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

      // ラベルを入力（既存の値をクリアしてから入力）
      const reverseLabelInput = screen.getByLabelText('逆方向のラベル');
      await user.clear(reverseLabelInput);
      await user.type(reverseLabelInput, '同僚');

      // 更新ボタンをクリック
      const updateButton = screen.getByRole('button', { name: '更新' });
      await user.click(updateButton);

      // ストアが更新されたことを確認（新データモデル形式）
      await waitFor(() => {
        const state = useGraphStore.getState();
        // dual-directed: isDirected=true かつ forward.label !== reverse.label
        expect(state.relationships[0].isDirected).toBe(true);
        expect(state.relationships[0].forward.label).not.toBe(state.relationships[0].reverse.label);
        expect(state.relationships[0].reverse.label).toBe('同僚');
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
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            // dual-directed: 異なるラベル
            forward: { label: '好き', affection: null, awareness: null, role: null },
            reverse: { label: '無関心', affection: null, awareness: null, role: null },
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
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

    it('関係の向きが逆の場合、方向インジケーターとして「←」が表示される', () => {
      // person2 → person1 の関係を設定（v9: forward.label='上司'）
      useGraphStore.setState({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person2.id, // person2が起点
            targetPersonId: person1.id, // person1が終点
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            // one-way: person2→person1方向のラベル
            forward: { label: '上司', affection: null, awareness: null, role: null },
            reverse: { label: null, affection: null, awareness: null, role: null },
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // v9: 逆向き関係はフォームに「←」方向インジケーターで表示される
      expect(screen.getByText('←')).toBeInTheDocument();
    });

    it('片方向関係が逆向きの場合、左向き矢印（←）を表示する', async () => {
      const user = userEvent.setup();
      // person2 → person1 の関係を設定（逆向き）
      useGraphStore.setState({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person2.id, // person2が起点
            targetPersonId: person1.id, // person1が終点
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            // one-way: 逆方向ラベルなし
            forward: { label: '上司', affection: null, awareness: null, role: null },
            reverse: { label: null, affection: null, awareness: null, role: null },
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 方向インジケーターに「←」が表示される
      const indicator = screen.getByText('←');
      expect(indicator).toBeInTheDocument();

      // 関係タイプ選択ボタンをクリックしてドロップダウンを開く
      const typePickerButton = screen.getByRole('button', { name: '関係タイプを選択' });
      await user.click(typePickerButton);

      // 片方向が選択されている
      await waitFor(() => {
        const oneWayButton = screen.getByRole('button', { name: '片方向' });
        expect(oneWayButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('片方向関係を新規作成する場合、person1 → person2 の方向で保存される', async () => {
      const user = userEvent.setup();
      // 既存の関係をクリア
      useGraphStore.setState({
        relationships: [],
        selectedPersonIds: [person1.id, person2.id],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 関係タイプを片方向に変更
      const typePickerButton = screen.getByRole('button', { name: '関係タイプを選択' });
      await user.click(typePickerButton);

      const oneWayButton = await screen.findByRole('button', { name: '片方向' });
      await user.click(oneWayButton);

      // ラベルを入力
      const labelInput = screen.getByLabelText('関係のラベル');
      await user.type(labelInput, '部下');

      // 登録ボタンをクリック
      const submitButton = screen.getByRole('button', { name: '登録' });
      await user.click(submitButton);

      // ストアに person1 → person2 の関係が保存される
      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships).toHaveLength(1);
        expect(state.relationships[0].sourcePersonId).toBe(person1.id);
        expect(state.relationships[0].targetPersonId).toBe(person2.id);
        expect(state.relationships[0].forward.label).toBe('部下');
      });
    });

    it('逆向き片方向関係を編集すると元のsourcePersonId/targetPersonIdが保持される', async () => {
      const user = userEvent.setup();
      // person2 → person1 の関係を設定（逆向き）
      // v9: forward.label='上司' は person2→person1 方向のラベル
      useGraphStore.setState({
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person2.id,
            targetPersonId: person1.id,
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            // one-way: person2→person1 方向のラベル
            forward: { label: '上司', affection: null, awareness: null, role: null },
            reverse: { label: null, affection: null, awareness: null, role: null },
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // ラベルを入力（逆向きのため、ラベル入力はperson1→person2方向 = reverse.label）
      const labelInput = screen.getByLabelText('関係のラベル');
      await user.type(labelInput, 'マネージャー');

      // 更新ボタンをクリック
      const updateButton = screen.getByRole('button', { name: '更新' });
      await user.click(updateButton);

      // ストアに保存され、sourcePersonId/targetPersonIdが保持される（元の方向を保持）
      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships).toHaveLength(1);
        // 元の方向 person2→person1 が保持される
        expect(state.relationships[0].sourcePersonId).toBe(person2.id);
        expect(state.relationships[0].targetPersonId).toBe(person1.id);
      });
    });
  });

  describe('関係追加（v9）', () => {
    it('レイヤー選択UIが表示されない（v9ではレイヤー廃止）', async () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // v9ではレイヤー選択UIは廃止されている
      expect(screen.queryByRole('combobox', { name: 'レイヤー' })).not.toBeInTheDocument();
    });

    it('ラベルを入力して登録するとforward.labelに保存される', async () => {
      const user = userEvent.setup();

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // ラベルを入力
      const labelInput = screen.getByLabelText(/関係のラベル/);
      await user.type(labelInput, '友達');

      // 登録ボタンをクリック
      const addButton = screen.getByRole('button', { name: '登録' });
      await user.click(addButton);

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships).toHaveLength(1);
        // v9では forward.label に保存される
        expect(state.relationships[0].forward.label).toBe('友達');
      });
    });
  });

  describe('既存関係の初期表示（v9）', () => {
    it('既存の関係がある場合、forward.labelがラベル入力の初期値として表示される', () => {
      // v9では1ペアにつき1つの関係（マージ方式）
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person1.id,
            targetPersonId: person2.id,
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            forward: { label: '友人', affection: null, awareness: null, role: null },
            reverse: { label: '友人', affection: null, awareness: null, role: null },
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        selectedPersonIds: [person1.id, person2.id],
        forceEnabled: true,
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 既存関係のforward.labelが初期値として表示される
      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput.value).toBe('友人');
    });
  });

  describe('関係ラベルの表示と編集（v9）', () => {
    it('既存の関係があるペアを選択するとforward.labelが表示される', () => {
      // v9ではペアにつき1つの関係のみ（マージ方式）
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [
          {
            id: 'rel-1',
            sourcePersonId: person1.id,
            targetPersonId: person2.id,
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            forward: { label: '友人', affection: null, awareness: null, role: null },
            reverse: { label: '友人', affection: null, awareness: null, role: null },
            tags: [],
            narrative: { summary: null, notes: null, turningPoints: [] },
            colorOverride: null,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        selectedPersonIds: [person1.id, person2.id],
        forceEnabled: true,
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // forward.labelがラベル入力に表示される
      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput.value).toBe('友人');
    });

    it('関係がない状態でフォームが表示されるとラベルが空になる', () => {
      // 関係なしの状態
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [],
        selectedPersonIds: [person1.id, person2.id],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // ラベル入力が空であることを確認
      const labelInput = screen.getByLabelText(/関係のラベル/) as HTMLInputElement;
      expect(labelInput.value).toBe('');
    });
  });

  describe('関係タイプ選択UI（v9）', () => {
    it('初期状態で関係タイプ選択ボタンが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 初期状態ではタイプ選択ボタンが表示されている
      expect(screen.getByRole('button', { name: '関係タイプを選択' })).toBeInTheDocument();
    });

    it('v9ではweightスライダーが表示されない（weight廃止）', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // v9ではweightスライダーは廃止されている
      expect(screen.queryByLabelText(/強度/)).not.toBeInTheDocument();
    });

    it('関係を登録するとv9形式でストアに保存される', async () => {
      const user = userEvent.setup();

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // ラベルを入力
      const labelInput = screen.getByLabelText(/関係のラベル/);
      await user.type(labelInput, '好き');

      // 登録ボタンをクリック
      const addButton = screen.getByRole('button', { name: '登録' });
      await user.click(addButton);

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships).toHaveLength(1);
        // v9形式: forward.labelに保存される
        expect(state.relationships[0].forward.label).toBe('好き');
        // v9形式: symmetric, tags, narrative, colorOverrideが存在する
        expect(state.relationships[0].symmetric).toBeDefined();
        expect(state.relationships[0].tags).toBeDefined();
        expect(state.relationships[0].narrative).toBeDefined();
      });
    });
  });
});
