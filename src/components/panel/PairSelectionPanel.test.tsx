/**
 * PairSelectionPanelコンポーネントのテスト（v11プロパティグラフ方式）
 *
 * 検証項目:
 * - UI基本構造（タイトル・アバター・ボタン）
 * - 新規追加モード（エッジなし）
 * - 編集モード（エッジあり）
 * - エッジ追加・更新・削除
 * - マルチグラフ対応（複数エッジのリスト表示・切り替え）
 * - symmetric（無向）トグル
 * - 定型フィールド（closeness/trust/tension/secrecy/affection/awareness/role）
 * - 物語的情報（narrative）
 * - エッジの色上書き（colorOverride）
 * - タグ入力
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { PairSelectionPanel } from './PairSelectionPanel';
import { useGraphStore } from '@/stores/useGraphStore';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

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

// ─── テストデータファクトリ ─────────────────────────────────────────────────

/**
 * v11 Person オブジェクトを生成するファクトリ
 */
function makePerson(overrides: Partial<Person> & { id: string; name: string }): Person {
  return {
    imageDataUrl: undefined,
    labels: ['人物'],
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * v11 Relationship オブジェクトを生成するファクトリ
 * デフォルト: 有向（symmetric=false）、labelなし、propertiesは全null
 */
function makeRel(overrides: Partial<Relationship> & { id: string; type: string; sourceId: string; targetId: string }): Relationship {
  return {
    label: null,
    symmetric: false,
    tags: [],
    narrative: { summary: null, notes: null, turningPoints: [] },
    colorOverride: null,
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── テストデータ ─────────────────────────────────────────────────────────

describe('PairSelectionPanel', () => {
  const person1 = makePerson({ id: 'person-1', name: '山田太郎' });
  const person2 = makePerson({ id: 'person-2', name: '佐藤花子' });

  beforeEach(() => {
    // ストアをリセット
    useGraphStore.setState({
      persons: [person1, person2],
      relationships: [],
      selectedPersonIds: [person1.id, person2.id],
      forceEnabled: true,
    });
  });

  // ─── UI基本構造 ───────────────────────────────────────────────────────────

  describe('UI基本構造', () => {
    it('フォーム上部に「2人を選択中」タイトルが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('2人を選択中')).toBeInTheDocument();
    });

    it('フォーム上部に「選択を解除」ボタンが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: '選択を解除' })).toBeInTheDocument();
    });

    it('フォーム内に2人の名前が表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('山田太郎')).toBeInTheDocument();
      expect(screen.getByText('佐藤花子')).toBeInTheDocument();
    });

    it('フォーム内のアバターがクリック可能なボタンである', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: '山田太郎を選択' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '佐藤花子を選択' })).toBeInTheDocument();
    });

    it('「選択を解除」ボタンをクリックすると選択が解除される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByRole('button', { name: '選択を解除' }));

      await waitFor(() => {
        expect(useGraphStore.getState().selectedPersonIds).toHaveLength(0);
      });
    });

    it('アバターをクリックすると単一選択に切り替わる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByRole('button', { name: '山田太郎を選択' }));

      await waitFor(() => {
        expect(useGraphStore.getState().selectedPersonIds).toEqual([person1.id]);
      });
    });
  });

  // ─── 新規追加モード（エッジなし） ─────────────────────────────────────────

  describe('新規追加モード（エッジなし）', () => {
    it('「関係タイプ」入力フィールドが表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByLabelText('関係タイプ')).toBeInTheDocument();
    });

    it('「登録」ボタンが表示される（新規モード）', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument();
    });

    it('「この関係を削除」ボタンは表示されない（新規モード）', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.queryByRole('button', { name: 'この関係を削除' })).not.toBeInTheDocument();
    });

    it('エッジタイプが空の状態では「登録」ボタンがdisabled', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: '登録' })).toBeDisabled();
    });

    it('「新しい関係を追加」ボタンが初期状態でaria-pressed=trueになっている', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: '新しい関係を追加' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ─── エッジ追加 ──────────────────────────────────────────────────────────

  describe('エッジ追加', () => {
    it('関係タイプを入力して登録するとストアに追加される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const typeInput = screen.getByLabelText('関係タイプ');
      await user.type(typeInput, '友達');

      await user.click(screen.getByRole('button', { name: '登録' }));

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships).toHaveLength(1);
        // v11: type フィールドに保存される
        expect(state.relationships[0].type).toBe('友達');
      });
    });

    it('新規追加するとsourceId=person1、targetId=person2 で保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.type(screen.getByLabelText('関係タイプ'), '部下');
      await user.click(screen.getByRole('button', { name: '登録' }));

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships[0].sourceId).toBe(person1.id);
        expect(state.relationships[0].targetId).toBe(person2.id);
      });
    });

    it('表示ラベルを入力して登録するとlabelに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.type(screen.getByLabelText('関係タイプ'), '同僚');
      await user.type(screen.getByLabelText('表示ラベル', { exact: false }), '仕事仲間');
      await user.click(screen.getByRole('button', { name: '登録' }));

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships[0].type).toBe('同僚');
        expect(state.relationships[0].label).toBe('仕事仲間');
      });
    });

    it('登録するとsymmetric/tags/narrative/colorOverrideが含まれる（v11形式）', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.type(screen.getByLabelText('関係タイプ'), '好き');
      await user.click(screen.getByRole('button', { name: '登録' }));

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships[0].symmetric).toBeDefined();
        expect(state.relationships[0].tags).toBeDefined();
        expect(state.relationships[0].narrative).toBeDefined();
        expect(state.relationships[0].colorOverride).toBeNull();
      });
    });
  });

  // ─── 編集モード（エッジあり） ─────────────────────────────────────────────

  describe('編集モード（エッジあり）', () => {
    const existingRel = makeRel({
      id: 'rel-1',
      type: '友人',
      sourceId: person1.id,
      targetId: person2.id,
    });

    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [existingRel],
        selectedPersonIds: [person1.id, person2.id],
      });
    });

    it('既存エッジがリストに表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // エッジのtypeがボタンに表示される
      expect(screen.getByText('友人')).toBeInTheDocument();
    });

    it('フォームに既存のエッジタイプが初期値として設定される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const typeInput = screen.getByLabelText('関係タイプ') as HTMLInputElement;
      expect(typeInput.value).toBe('友人');
    });

    it('「更新」ボタンが表示される（編集モード）', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument();
    });

    it('「この関係を削除」ボタンが表示される（編集モード）', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByRole('button', { name: 'この関係を削除' })).toBeInTheDocument();
    });

    it('エッジタイプを変更して更新するとストアに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const typeInput = screen.getByLabelText('関係タイプ');
      await user.clear(typeInput);
      await user.type(typeInput, '親友');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        const state = useGraphStore.getState();
        expect(state.relationships[0].type).toBe('親友');
      });
    });

    it('関係を削除できる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByRole('button', { name: 'この関係を削除' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships).toHaveLength(0);
      });
    });

    it('既存のlabelがフォームの「表示ラベル」に反映される', () => {
      // label が設定されているエッジ
      useGraphStore.setState({
        relationships: [makeRel({
          id: 'rel-1',
          type: '同僚',
          sourceId: person1.id,
          targetId: person2.id,
          label: '仕事仲間',
        })],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const labelInput = screen.getByLabelText('表示ラベル', { exact: false }) as HTMLInputElement;
      expect(labelInput.value).toBe('仕事仲間');
    });
  });

  // ─── symmetric（無向）トグル ───────────────────────────────────────────────

  describe('symmetric（無向）トグル', () => {
    it('symmetric=true の既存エッジでは、無向チェックボックスがONになっている', () => {
      useGraphStore.setState({
        relationships: [makeRel({
          id: 'rel-1',
          type: '友人',
          sourceId: person1.id,
          targetId: person2.id,
          symmetric: true,
        })],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const checkbox = screen.getByRole('checkbox', { name: '無向エッジ（矢印なし）' });
      expect(checkbox).toBeChecked();
    });

    it('symmetric=false の既存エッジでは、無向チェックボックスがOFFになっている', () => {
      useGraphStore.setState({
        relationships: [makeRel({
          id: 'rel-1',
          type: '好き',
          sourceId: person1.id,
          targetId: person2.id,
          symmetric: false,
        })],
      });

      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      const checkbox = screen.getByRole('checkbox', { name: '無向エッジ（矢印なし）' });
      expect(checkbox).not.toBeChecked();
    });

    it('無向チェックをONにして更新するとsymmetric===trueが保存される', async () => {
      useGraphStore.setState({
        relationships: [makeRel({
          id: 'rel-1',
          type: '友人',
          sourceId: person1.id,
          targetId: person2.id,
          symmetric: false,
        })],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByRole('checkbox', { name: '無向エッジ（矢印なし）' }));
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].symmetric).toBe(true);
      });
    });

    it('無向チェックをOFFにして更新するとsymmetric===falseが保存される', async () => {
      useGraphStore.setState({
        relationships: [makeRel({
          id: 'rel-1',
          type: '友人',
          sourceId: person1.id,
          targetId: person2.id,
          symmetric: true,
        })],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByRole('checkbox', { name: '無向エッジ（矢印なし）' }));
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].symmetric).toBe(false);
      });
    });
  });

  // ─── マルチグラフ（複数エッジのリスト表示・切り替え） ─────────────────────

  describe('マルチグラフ（複数エッジ）', () => {
    const rel1 = makeRel({ id: 'rel-1', type: '友人', sourceId: person1.id, targetId: person2.id });
    const rel2 = makeRel({ id: 'rel-2', type: '同僚', sourceId: person2.id, targetId: person1.id });

    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [rel1, rel2],
        selectedPersonIds: [person1.id, person2.id],
      });
    });

    it('複数エッジがある場合、リストに全て表示される', () => {
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      expect(screen.getByText('友人')).toBeInTheDocument();
      expect(screen.getByText('同僚')).toBeInTheDocument();
    });

    it('エッジボタンをクリックすると選択が切り替わる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 最初はrel1が選択されている（最初のエッジ）
      // rel2のボタンをクリック
      const rel2Button = screen.getByRole('button', { name: (name, el) => el.textContent?.includes('同僚') === true });
      await user.click(rel2Button);

      // フォームがrel2のデータに切り替わる
      await waitFor(() => {
        const typeInput = screen.getByLabelText('関係タイプ') as HTMLInputElement;
        expect(typeInput.value).toBe('同僚');
      });
    });

    it('「新しい関係を追加」ボタンをクリックするとフォームがリセットされる', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      // 最初はrel1が選択されている
      await user.click(screen.getByRole('button', { name: '新しい関係を追加' }));

      await waitFor(() => {
        const typeInput = screen.getByLabelText('関係タイプ') as HTMLInputElement;
        expect(typeInput.value).toBe('');
      });
    });
  });

  // ─── 定型フィールドUI（symmetric props: closeness/trust/tension/secrecy） ─

  describe('定型フィールドUI（数値属性）', () => {
    const baseRel = makeRel({
      id: 'rel-1',
      type: '友人',
      sourceId: person1.id,
      targetId: person2.id,
      properties: { closeness: null, trust: null, tension: null, secrecy: null },
    });

    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRel],
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

      await user.click(screen.getByText('定型フィールド'));

      await waitFor(() => {
        expect(screen.getByRole('slider', { name: '親密度' })).toBeInTheDocument();
      });
    });

    it('properties.closeness===nullのとき、「未設定」チェックがONでスライダーがdisabled', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: '親密度を未設定' });
        expect(checkbox).toBeChecked();
        const slider = screen.getByRole('slider', { name: '親密度' });
        expect(slider).toBeDisabled();
      });
    });

    it('properties.closeness===0.5のとき、スライダーが0.5に初期化される', async () => {
      useGraphStore.setState({
        relationships: [{ ...baseRel, properties: { ...baseRel.properties, closeness: 0.5 } }],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));

      await waitFor(() => {
        const slider = screen.getByRole('slider', { name: '親密度' }) as HTMLInputElement;
        expect(slider).not.toBeDisabled();
        expect(Number(slider.value)).toBe(0.5);
      });
    });

    it('closenessを0.7に設定して更新するとproperties.closeness===0.7が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));
      await waitFor(() => screen.getByRole('checkbox', { name: '親密度を未設定' }));

      // 「未設定」チェックをOFF → スライダーが有効になる
      await user.click(screen.getByRole('checkbox', { name: '親密度を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '親密度' }), { target: { value: '0.7' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].properties.closeness).toBe(0.7);
      });
    });

    it('trustを0.6に設定して更新するとproperties.trust===0.6が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));
      await waitFor(() => screen.getByRole('checkbox', { name: '信頼度を未設定' }));

      await user.click(screen.getByRole('checkbox', { name: '信頼度を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '信頼度' }), { target: { value: '0.6' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].properties.trust).toBe(0.6);
      });
    });

    it('tensionを0.4に設定して更新するとproperties.tension===0.4が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));
      await waitFor(() => screen.getByRole('checkbox', { name: '緊張・対立度を未設定' }));

      await user.click(screen.getByRole('checkbox', { name: '緊張・対立度を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '緊張・対立度' }), { target: { value: '0.4' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].properties.tension).toBe(0.4);
      });
    });

    it('secrecyを0.9に設定して更新するとproperties.secrecy===0.9が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));
      await waitFor(() => screen.getByRole('checkbox', { name: '秘匿性を未設定' }));

      await user.click(screen.getByRole('checkbox', { name: '秘匿性を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '秘匿性' }), { target: { value: '0.9' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].properties.secrecy).toBe(0.9);
      });
    });
  });

  // ─── 定型フィールドUI（方向プロパティ: affection/awareness/role） ─────────

  describe('定型フィールドUI（方向プロパティ）', () => {
    const baseRel = makeRel({
      id: 'rel-1',
      type: '友人',
      sourceId: person1.id,
      targetId: person2.id,
      properties: { affection: null, awareness: null, role: null },
    });

    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRel],
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

      await user.click(screen.getByText('定型フィールド'));

      await waitFor(() => {
        expect(screen.getByRole('slider', { name: '好悪' })).toBeInTheDocument();
      });
    });

    it('affectionを0.8に設定して更新するとproperties.affection===0.8が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));
      await waitFor(() => screen.getByRole('checkbox', { name: '好悪を未設定' }));

      await user.click(screen.getByRole('checkbox', { name: '好悪を未設定' }));
      fireEvent.change(screen.getByRole('slider', { name: '好悪' }), { target: { value: '0.8' } });
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].properties.affection).toBe(0.8);
      });
    });

    it('awarenessセレクトで「認知済み」を選ぶとproperties.awareness===knownが保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));
      await waitFor(() => screen.getByRole('combobox', { name: '認知状況' }));

      await user.selectOptions(screen.getByRole('combobox', { name: '認知状況' }), 'known');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].properties.awareness).toBe('known');
      });
    });

    it('roleテキストを「上司」にして更新するとproperties.role===上司が保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('定型フィールド'));
      await waitFor(() => screen.getByRole('textbox', { name: '役割' }));

      await user.type(screen.getByRole('textbox', { name: '役割' }), '上司');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].properties.role).toBe('上司');
      });
    });
  });

  // ─── タグ入力UI ──────────────────────────────────────────────────────────

  describe('タグ入力UI', () => {
    const baseRel = makeRel({
      id: 'rel-1',
      type: '友人',
      sourceId: person1.id,
      targetId: person2.id,
    });

    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRel],
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

      await user.click(screen.getByRole('button', { name: '親友を削除' }));

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
        relationships: [{ ...baseRel, tags: ['幼馴染', '親友'] }],
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

  // ─── 物語的情報（narrative） ──────────────────────────────────────────────

  describe('narrativeフィールドUI', () => {
    const baseRel = makeRel({
      id: 'rel-1',
      type: '友人',
      sourceId: person1.id,
      targetId: person2.id,
    });

    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRel],
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

      await user.click(screen.getByText('物語的情報'));

      await waitFor(() => {
        expect(screen.getByLabelText('関係の概要')).toBeInTheDocument();
        expect(screen.getByLabelText('メモ・補足')).toBeInTheDocument();
      });
    });

    it('summaryを入力して更新するとnarrative.summaryに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('物語的情報'));
      await waitFor(() => screen.getByLabelText('関係の概要'));

      await user.type(screen.getByLabelText('関係の概要'), '幼馴染で高校まで同じ学校');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].narrative.summary).toBe('幼馴染で高校まで同じ学校');
      });
    });

    it('notesを入力して更新するとnarrative.notesに保存される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('物語的情報'));
      await waitFor(() => screen.getByLabelText('メモ・補足'));

      await user.type(screen.getByLabelText('メモ・補足'), '仲違い後に和解した経緯あり');
      await user.click(screen.getByRole('button', { name: '更新' }));

      await waitFor(() => {
        expect(useGraphStore.getState().relationships[0].narrative.notes).toBe('仲違い後に和解した経緯あり');
      });
    });

    it('「+ ターニングポイントを追加」を押すと入力フィールドが追加される', async () => {
      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('物語的情報'));
      await waitFor(() => screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await user.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await waitFor(() => {
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

      await user.click(screen.getByText('物語的情報'));
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

      await user.click(screen.getByText('物語的情報'));
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

      await user.click(screen.getByText('物語的情報'));
      await waitFor(() => screen.getByRole('button', { name: /ターニングポイントを追加/ }));

      await user.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));
      await waitFor(() => screen.getByPlaceholderText(/時期・時点/));

      await user.click(screen.getByRole('button', { name: 'このターニングポイントを削除' }));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/時期・時点/)).not.toBeInTheDocument();
      });
    });

    it('既存のnarrative.summaryが初期値としてtextareaに反映される', async () => {
      useGraphStore.setState({
        relationships: [{
          ...baseRel,
          narrative: { summary: '幼馴染で高校まで同じ学校', notes: null, turningPoints: [] },
        }],
      });

      const user = userEvent.setup();
      render(
        <ReactFlowProvider>
          <PairSelectionPanel persons={[person1, person2]} />
        </ReactFlowProvider>
      );

      await user.click(screen.getByText('物語的情報'));

      await waitFor(() => {
        const summaryInput = screen.getByLabelText('関係の概要') as HTMLTextAreaElement;
        expect(summaryInput.value).toBe('幼馴染で高校まで同じ学校');
      });
    });
  });

  // ─── colorOverrideフィールドUI ────────────────────────────────────────────

  describe('colorOverrideフィールドUI', () => {
    const baseRel = makeRel({
      id: 'rel-1',
      type: '友人',
      sourceId: person1.id,
      targetId: person2.id,
    });

    beforeEach(() => {
      useGraphStore.setState({
        persons: [person1, person2],
        relationships: [baseRel],
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
        relationships: [{ ...baseRel, colorOverride: '#ff0000' }],
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
        relationships: [{ ...baseRel, colorOverride: '#0000ff' }],
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
