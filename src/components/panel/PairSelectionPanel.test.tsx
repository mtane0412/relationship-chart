/**
 * PairSelectionPanelコンポーネントのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { PairSelectionPanel } from './PairSelectionPanel';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';
import type { RelationshipV9 } from '@/types/relationship';

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
        expect(state.relationships[0].forward.label).toBe('友人');
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
      // 既存値をクリアしてから入力することで、append ではなく上書きになる
      await user.clear(labelInput);
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
        // colorOverrideは登録時にnullになっている
        expect(state.relationships[0].colorOverride).toBeNull();
      });
    });
  });

  // ─── v9 定型フィールドのUI（issue #75）───────────────────────────────────────

  /**
   * symmetric フィールドのテスト用ベースとなる既存関係（closeness=nullのデフォルト状態）
   */
  const baseRelationship: RelationshipV9 = {
    id: 'rel-v9',
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
  };

  describe('定型フィールドUI（symmetric）', () => {
    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRelationship],
        selectedPersonIds: [person1.id, person2.id],
      });
    });

    it('「定型フィールド」アコーディオンを展開するとclosenessスライダーが表示される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 「定型フィールド」アコーディオンを展開
      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      // closenessスライダーが表示される
      await waitFor(() => {
        expect(screen.getByRole('slider', { name: '親密度' })).toBeInTheDocument();
      });
    });

    it('symmetric.closeness===nullのとき、「未設定」チェックがONでスライダーがdisabled', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => {
        // 「未設定」チェックがON
        const checkbox = screen.getByRole('checkbox', { name: '親密度を未設定' });
        expect(checkbox).toBeChecked();
        // スライダーはdisabled
        const slider = screen.getByRole('slider', { name: '親密度' });
        expect(slider).toBeDisabled();
      });
    });

    it('symmetric.closeness===0.5のとき、スライダーが0.5に初期化され「未設定」チェックがOFF', async () => {
      // closeness=0.5 の関係を設定
      useGraphStore.setState({
        relationships: [{ ...baseRelationship, symmetric: { ...baseRelationship.symmetric, closeness: 0.5 } }],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: '親密度を未設定' });
        expect(checkbox).not.toBeChecked();
        const slider = screen.getByRole('slider', { name: '親密度' }) as HTMLInputElement;
        expect(slider).not.toBeDisabled();
        expect(Number(slider.value)).toBe(0.5);
      });
    });

    it('「未設定」チェックをOFFにしてclosenessを0.7に設定し更新するとsymmetric.closeness===0.7が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('checkbox', { name: '親密度を未設定' }));

      // 「未設定」チェックをOFF → スライダーが有効になる
      const checkbox = screen.getByRole('checkbox', { name: '親密度を未設定' });
      await user.click(checkbox);

      // スライダーを0.7に設定（range inputはfireEventで直接変更する）
      const slider = screen.getByRole('slider', { name: '親密度' });
      fireEvent.change(slider, { target: { value: '0.7' } });

      // 更新ボタンをクリック
      const updateButton = screen.getByRole('button', { name: '更新' });
      await user.click(updateButton);

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships[0].symmetric.closeness).toBe(0.7);
      });
    });

    it('trustスライダーの値を0.6に設定して更新するとsymmetric.trust===0.6が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('checkbox', { name: '信頼度を未設定' }));

      await user.click(screen.getByRole('checkbox', { name: '信頼度を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '信頼度' }), { target: { value: '0.6' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].symmetric.trust).toBe(0.6);
      });
    });

    it('tensionスライダーの値を0.4に設定して更新するとsymmetric.tension===0.4が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('checkbox', { name: '緊張・対立度を未設定' }));

      await user.click(screen.getByRole('checkbox', { name: '緊張・対立度を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '緊張・対立度' }), { target: { value: '0.4' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].symmetric.tension).toBe(0.4);
      });
    });

    it('secrecyスライダーの値を0.9に設定して更新するとsymmetric.secrecy===0.9が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('checkbox', { name: '秘匿性を未設定' }));

      await user.click(screen.getByRole('checkbox', { name: '秘匿性を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '秘匿性' }), { target: { value: '0.9' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].symmetric.secrecy).toBe(0.9);
      });
    });

    it('kinshipセレクトで「兄弟・姉妹」を選ぶとsymmetric.kinship===siblingが保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('combobox', { name: '血縁・親族' }));

      await user.selectOptions(screen.getByRole('combobox', { name: '血縁・親族' }), 'sibling');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].symmetric.kinship).toBe('sibling');
      });
    });

    it('kinshipセレクトで「（血縁なし）」を選ぶとsymmetric.kinship===nullが保存される', async () => {
      // まずkinshipをsiblingに設定
      useGraphStore.setState({
        relationships: [{ ...baseRelationship, symmetric: { ...baseRelationship.symmetric, kinship: 'sibling' } }],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('combobox', { name: '血縁・親族' }));

      await user.selectOptions(screen.getByRole('combobox', { name: '血縁・親族' }), '');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].symmetric.kinship).toBeNull();
      });
    });
  });

  describe('定型フィールドUI（方向プロパティ）', () => {
    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRelationship],
        selectedPersonIds: [person1.id, person2.id],
      });
    });

    it('「定型フィールド」アコーディオンを展開するとaffectionスライダーが表示される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => {
        // person1→person2方向のaffectionスライダー
        expect(screen.getByRole('slider', { name: `${person1.name}→${person2.name} 好悪` })).toBeInTheDocument();
      });
    });

    it('forward.affectionがnullのとき、「未設定」チェックがONでスライダーがdisabled', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: `${person1.name}→${person2.name} 好悪を未設定` });
        expect(checkbox).toBeChecked();
        const slider = screen.getByRole('slider', { name: `${person1.name}→${person2.name} 好悪` });
        expect(slider).toBeDisabled();
      });
    });

    it('person1→person2方向のaffectionを0.8に設定して更新するとforward.affection===0.8が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('checkbox', { name: `${person1.name}→${person2.name} 好悪を未設定` }));

      await user.click(screen.getByRole('checkbox', { name: `${person1.name}→${person2.name} 好悪を未設定` }));
      fireEvent.change(screen.getByRole('slider', { name: `${person1.name}→${person2.name} 好悪` }), { target: { value: '0.8' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].forward.affection).toBe(0.8);
      });
    });

    it('isReversed=trueの関係では、UI上のperson1→person2の入力がstored reverse.affectionにマップされる', async () => {
      // person2 → person1 方向の関係（isReversed=true になる）
      useGraphStore.setState({
        relationships: [{
          ...baseRelationship,
          sourcePersonId: person2.id,
          targetPersonId: person1.id,
          forward: { label: '上司', affection: null, awareness: null, role: null },
          reverse: { label: null, affection: null, awareness: null, role: null },
        }],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('checkbox', { name: `${person1.name}→${person2.name} 好悪を未設定` }));

      // UI上の person1→person2 方向を入力（isReversed=true なので stored の reverse に入る）
      await user.click(screen.getByRole('checkbox', { name: `${person1.name}→${person2.name} 好悪を未設定` }));
      fireEvent.change(screen.getByRole('slider', { name: `${person1.name}→${person2.name} 好悪` }), { target: { value: '0.5' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        const rel = useGraphStore.getState().relationships[0];
        // isReversed=true なので stored.reverse が person1→person2 側にマップされる
        expect(rel.reverse.affection).toBe(0.5);
        // stored.forward は変更されない
        expect(rel.forward.affection).toBeNull();
      });
    });

    it('awarenessセレクトで「認知済み」を選ぶとforward.awareness===knownが保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('combobox', { name: `${person1.name}→${person2.name} 認知状況` }));

      await user.selectOptions(
        screen.getByRole('combobox', { name: `${person1.name}→${person2.name} 認知状況` }),
        'known'
      );
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].forward.awareness).toBe('known');
      });
    });

    it('roleテキスト入力で「上司」を入れて更新するとforward.role===上司が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByLabelText(`${person1.name}→${person2.name} 役割`));

      await user.type(screen.getByLabelText(`${person1.name}→${person2.name} 役割`), '上司');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].forward.role).toBe('上司');
      });
    });

    it('person2→person1方向のroleテキストを「部下」にして更新するとreverse.role===部下が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('定型フィールド');
      await user.click(accordion);

      await waitFor(() => screen.getByLabelText(`${person2.name}→${person1.name} 役割`));

      await user.type(screen.getByLabelText(`${person2.name}→${person1.name} 役割`), '部下');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].reverse.role).toBe('部下');
      });
    });
  });

  describe('タグ入力UI（v9）', () => {
    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRelationship],
        selectedPersonIds: [person1.id, person2.id],
      });
    });

    it('タグ入力フィールドが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByPlaceholderText(/タグを追加/)).toBeInTheDocument();
    });

    it('タグを入力してEnterを押すとチップとして追加される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const tagInput = screen.getByPlaceholderText(/タグを追加/);
      await user.type(tagInput, '親友');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('親友')).toBeInTheDocument();
      });
    });

    it('追加されたタグチップの「×」をクリックするとタグが削除される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const tagInput = screen.getByPlaceholderText(/タグを追加/);
      await user.type(tagInput, '親友');
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByText('親友'));

      // タグ削除ボタンをクリック
      const deleteButton = screen.getByRole('button', { name: '親友を削除' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('親友')).not.toBeInTheDocument();
      });
    });

    it('重複するタグは追加されない', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const tagInput = screen.getByPlaceholderText(/タグを追加/);
      await user.type(tagInput, '親友');
      await user.keyboard('{Enter}');
      await user.type(tagInput, '親友');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        // 「親友」チップが1つだけ存在する
        const chips = screen.getAllByText('親友');
        expect(chips).toHaveLength(1);
      });
    });

    it('IME変換中（isComposing=true）のEnterではタグが追加されない', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const tagInput = screen.getByPlaceholderText(/タグを追加/);
      await user.type(tagInput, '親友{Enter}');

      // userEventはデフォルトでisComposing=falseなので通常の追加が起きる（IME開始イベントを送る方法なし）
      // 代わりにキーボードイベントを手動でdispatchしてisComposing=trueを確認する
      await user.clear(tagInput);
      await user.type(tagInput, 'ライバル');
      // isComposing=trueのEnterキーイベントを発火
      fireEvent.keyDown(tagInput, { key: 'Enter', code: 'Enter', isComposing: true, nativeEvent: { isComposing: true } });

      // isComposing=trueのEnterでは追加されない
      await waitFor(() => {
        expect(screen.queryByText('ライバル')).not.toBeInTheDocument();
      });
    });

    it('datalistにSUGGESTED_TAGSの候補が含まれる', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // datalistが存在することを確認
      const datalist = document.getElementById('tag-suggestions');
      expect(datalist).toBeInTheDocument();
      expect(datalist?.querySelector('option[value="親友"]')).toBeInTheDocument();
      expect(datalist?.querySelector('option[value="ライバル"]')).toBeInTheDocument();
    });

    it('タグを追加して更新ボタンをクリックするとtagsがストアに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const tagInput = screen.getByPlaceholderText(/タグを追加/);
      await user.type(tagInput, '幼馴染');
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByText('幼馴染'));

      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].tags).toContain('幼馴染');
      });
    });

    it('既存のタグが初期値としてチップ表示される', () => {
      useGraphStore.setState({
        relationships: [{ ...baseRelationship, tags: ['幼馴染', '親友'] }],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('幼馴染')).toBeInTheDocument();
      expect(screen.getByText('親友')).toBeInTheDocument();
    });
  });

  describe('narrativeフィールドUI（v9）', () => {
    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRelationship],
        selectedPersonIds: [person1.id, person2.id],
      });
    });

    it('「物語的情報」アコーディオンを展開するとsummary textareaが表示される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => {
        expect(screen.getByLabelText('関係の概要')).toBeInTheDocument();
        expect(screen.getByLabelText('メモ・補足')).toBeInTheDocument();
      });
    });

    it('summaryに「幼馴染で高校まで同じ学校」を入力して更新するとnarrative.summaryに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => screen.getByLabelText('関係の概要'));

      await user.type(screen.getByLabelText('関係の概要'), '幼馴染で高校まで同じ学校');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].narrative.summary).toBe('幼馴染で高校まで同じ学校');
      });
    });

    it('notesに「仲違い後に和解した経緯あり」を入力して更新するとnarrative.notesに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => screen.getByLabelText('メモ・補足'));

      await user.type(screen.getByLabelText('メモ・補足'), '仲違い後に和解した経緯あり');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].narrative.notes).toBe('仲違い後に和解した経緯あり');
      });
    });

    it('「+ ターニングポイントを追加」を押すと空行が追加される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await user.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await waitFor(() => {
        // at と note の入力フィールドが表示される
        expect(screen.getByPlaceholderText(/時期・時点/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/出来事/)).toBeInTheDocument();
      });
    });

    it('ターニングポイントのatとnoteを入力して更新するとnarrative.turningPointsに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await user.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await waitFor(() => screen.getByPlaceholderText(/時期・時点/));

      await user.type(screen.getByPlaceholderText(/時期・時点/), '高校入学時');
      await user.type(screen.getByPlaceholderText(/出来事/), '初めて出会った');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        const turningPoints = useGraphStore.getState().relationships[0].narrative.turningPoints;
        expect(turningPoints).toHaveLength(1);
        expect(turningPoints[0].at).toBe('高校入学時');
        expect(turningPoints[0].note).toBe('初めて出会った');
      });
    });

    it('atもnoteも空のターニングポイント行は保存から除外される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      // 空行を追加してそのまま更新
      await user.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        const turningPoints = useGraphStore.getState().relationships[0].narrative.turningPoints;
        expect(turningPoints).toHaveLength(0);
      });
    });

    it('ターニングポイント行の削除ボタンをクリックするとその行が消える', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await user.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await waitFor(() => screen.getByPlaceholderText(/時期・時点/));

      // 削除ボタンをクリック
      await user.click(screen.getByRole('button', { name: 'このターニングポイントを削除' }));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/時期・時点/)).not.toBeInTheDocument();
      });
    });

    it('既存のnarrative.summaryが初期値としてtextareaに反映される', async () => {
      useGraphStore.setState({
        relationships: [{
          ...baseRelationship,
          narrative: { summary: '幼馴染で高校まで同じ学校', notes: null, turningPoints: [] },
        }],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const accordion = screen.getByText('物語的情報');
      await user.click(accordion);

      await waitFor(() => {
        const summaryInput = screen.getByLabelText('関係の概要') as HTMLTextAreaElement;
        expect(summaryInput.value).toBe('幼馴染で高校まで同じ学校');
      });
    });
  });

  describe('colorOverrideフィールドUI（v9）', () => {
    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRelationship],
        selectedPersonIds: [person1.id, person2.id],
      });
    });

    it('colorOverride===nullのとき「タグから派生」と表示されカラーピッカーが非表示', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('タグから派生')).toBeInTheDocument();
      expect(screen.queryByLabelText('エッジの色')).not.toBeInTheDocument();
    });

    it('「上書きする」ボタンをクリックするとカラーピッカーが現れる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByRole('button', { name: '色を上書きする' }));

      await waitFor(() => {
        expect(screen.getByLabelText('エッジの色')).toBeInTheDocument();
      });
    });

    it('カラーピッカーで色を設定して更新するとcolorOverrideに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByRole('button', { name: '色を上書きする' }));

      await waitFor(() => screen.getByLabelText('エッジの色'));

      fireEvent.change(screen.getByLabelText('エッジの色'), { target: { value: '#ff0000' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].colorOverride).toBe('#ff0000');
      });
    });

    it('「クリア」ボタンでcolorOverrideがnullに戻る', async () => {
      useGraphStore.setState({
        relationships: [{ ...baseRelationship, colorOverride: '#ff0000' }],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 既存のcolorOverrideがある場合はピッカーが表示されている
      await waitFor(() => screen.getByLabelText('エッジの色'));

      await user.click(screen.getByRole('button', { name: '色をクリア' }));
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].colorOverride).toBeNull();
      });
    });

    it('既存のcolorOverrideがある場合、カラーピッカーが最初から表示される', () => {
      useGraphStore.setState({
        relationships: [{ ...baseRelationship, colorOverride: '#0000ff' }],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByLabelText('エッジの色')).toBeInTheDocument();
    });
  });
});
