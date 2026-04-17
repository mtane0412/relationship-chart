/**
 * EdgeFilterPanelコンポーネントのテスト
 * タグ・述語によるエッジフィルタUIの振る舞いを検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EdgeFilterPanel } from './EdgeFilterPanel';
import { useGraphStore } from '@/stores/useGraphStore';

describe('EdgeFilterPanel', () => {
  beforeEach(() => {
    localStorage.clear();

    const store = useGraphStore.getState();
    // イテレーション中に配列が変化してスキップが起きないよう、コピーを取ってから反復する
    [...store.persons].forEach((person) => store.removePerson(person.id));
    [...store.relationships].forEach((rel) => store.removeRelationship(rel.id));
    store.clearSelection();
    // edgeFilter をリセット
    store.updateEdgeFilter({ tags: { mode: 'any', values: new Set() }, predicates: [] });
  });

  describe('タグなし状態', () => {
    it('相関図に関係が存在しない場合、パネル自体が非表示になる', () => {
      render(<EdgeFilterPanel />);

      // タグも述語フィルタもないため何も表示されない
      expect(screen.queryByText('エッジフィルター')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });

  describe('タグあり状態', () => {
    beforeEach(() => {
      // 人物と関係を追加する
      const store = useGraphStore.getState();
      store.addPerson({ name: '山田太郎' });
      store.addPerson({ name: '佐藤花子' });
      // addPerson後に再取得することで最新のpersonsを参照する
      const [p1, p2] = useGraphStore.getState().persons;

      store.addRelationship({
        sourcePersonId: p1.id,
        targetPersonId: p2.id,
        isDirected: false,
        forward: { label: '友人', affection: null, awareness: null, role: null },
        reverse: { label: '友人', affection: null, awareness: null, role: null },
        symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
        tags: ['上司', '同級生'],
        narrative: { summary: null, notes: null, turningPoints: [] },
        colorOverride: null,
      });
    });

    it('関係に設定されているタグがチェックボックスとして表示される', () => {
      render(<EdgeFilterPanel />);

      expect(screen.getByLabelText('上司')).toBeInTheDocument();
      expect(screen.getByLabelText('同級生')).toBeInTheDocument();
    });

    it('初期状態ではすべてのタグチェックボックスがオフ（全エッジ表示）になっている', () => {
      render(<EdgeFilterPanel />);

      const 上司checkbox = screen.getByLabelText('上司');
      const 同級生checkbox = screen.getByLabelText('同級生');

      expect(上司checkbox).not.toBeChecked();
      expect(同級生checkbox).not.toBeChecked();
    });

    it('タグチェックボックスをクリックするとedgeFilterのtagsに追加される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);

      await user.click(screen.getByLabelText('上司'));

      const store = useGraphStore.getState();
      expect(store.edgeFilter.tags.values).toContain('上司');
    });

    it('チェック済みタグを再クリックするとedgeFilterから削除される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);

      // 追加
      await user.click(screen.getByLabelText('上司'));
      expect(useGraphStore.getState().edgeFilter.tags.values).toContain('上司');

      // 削除
      await user.click(screen.getByLabelText('上司'));
      expect(useGraphStore.getState().edgeFilter.tags.values).not.toContain('上司');
    });

    it('フィルタが適用されている場合、「解除」ボタンが表示される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);

      await user.click(screen.getByLabelText('上司'));

      expect(screen.getByText('解除')).toBeInTheDocument();
    });

    it('「解除」ボタンをクリックするとedgeFilterがリセットされる', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);

      await user.click(screen.getByLabelText('上司'));
      await user.click(screen.getByText('解除'));

      const store = useGraphStore.getState();
      expect(store.edgeFilter.tags.values.size).toBe(0);
      expect(store.edgeFilter.predicates).toEqual([]);
    });

    it('フィルタが未適用の場合、「解除」ボタンは表示されない', () => {
      render(<EdgeFilterPanel />);

      expect(screen.queryByText('解除')).not.toBeInTheDocument();
    });
  });

  describe('述語フィルタ（条件セクション）', () => {
    beforeEach(() => {
      // 人物と関係を追加する（パネルを表示させるために必要）
      const store = useGraphStore.getState();
      store.addPerson({ name: '山田太郎' });
      store.addPerson({ name: '佐藤花子' });
      const [p1, p2] = useGraphStore.getState().persons;

      store.addRelationship({
        sourcePersonId: p1.id,
        targetPersonId: p2.id,
        isDirected: false,
        forward: { label: '友人', affection: null, awareness: null, role: null },
        reverse: { label: '友人', affection: null, awareness: null, role: null },
        symmetric: { closeness: 0.5, trust: 0.3, tension: 0.1, secrecy: 0.2, kinship: 'parent' },
        tags: [],
        narrative: { summary: null, notes: null, turningPoints: [] },
        colorOverride: null,
      });
    });

    it('「条件」セクションが表示される', () => {
      render(<EdgeFilterPanel />);

      expect(screen.getByText('条件')).toBeInTheDocument();
    });

    it('4つの数値述語チェックボックス（親密度・信頼度・緊張度・秘匿性）が表示される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      // <details>を開いて内部要素を操作可能にする
      await user.click(screen.getByText('条件'));

      expect(screen.getByLabelText('親密度を有効化')).toBeInTheDocument();
      expect(screen.getByLabelText('信頼度を有効化')).toBeInTheDocument();
      expect(screen.getByLabelText('緊張度を有効化')).toBeInTheDocument();
      expect(screen.getByLabelText('秘匿性を有効化')).toBeInTheDocument();
    });

    it('血縁ありチェックボックスが表示される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      expect(screen.getByLabelText('血縁あり')).toBeInTheDocument();
    });

    it('初期状態では全述語チェックボックスがオフになっている', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      expect(screen.getByLabelText('親密度を有効化')).not.toBeChecked();
      expect(screen.getByLabelText('信頼度を有効化')).not.toBeChecked();
      expect(screen.getByLabelText('緊張度を有効化')).not.toBeChecked();
      expect(screen.getByLabelText('秘匿性を有効化')).not.toBeChecked();
      expect(screen.getByLabelText('血縁あり')).not.toBeChecked();
    });

    it('親密度チェックボックスをONにするとpredicatesにcloseness_gteが追加される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      await user.click(screen.getByLabelText('親密度を有効化'));

      const { predicates } = useGraphStore.getState().edgeFilter;
      expect(predicates).toContainEqual({ type: 'closeness_gte', value: 0 });
    });

    it('親密度チェックボックスをOFFにするとpredicatesからcloseness_gteが削除される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      // ON → OFF
      await user.click(screen.getByLabelText('親密度を有効化'));
      await user.click(screen.getByLabelText('親密度を有効化'));

      const { predicates } = useGraphStore.getState().edgeFilter;
      expect(predicates.find((p) => p.type === 'closeness_gte')).toBeUndefined();
    });

    it('血縁ありチェックボックスをONにするとpredicatesにhas_kinshipが追加される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      await user.click(screen.getByLabelText('血縁あり'));

      const { predicates } = useGraphStore.getState().edgeFilter;
      expect(predicates).toContainEqual({ type: 'has_kinship' });
    });

    it('血縁ありチェックボックスをOFFにするとpredicatesからhas_kinshipが削除される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      await user.click(screen.getByLabelText('血縁あり'));
      await user.click(screen.getByLabelText('血縁あり'));

      const { predicates } = useGraphStore.getState().edgeFilter;
      expect(predicates.find((p) => p.type === 'has_kinship')).toBeUndefined();
    });

    it('親密度チェックボックスON後にスライダーを変更するとpredicatesのvalueが更新される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      await user.click(screen.getByLabelText('親密度を有効化'));
      const slider = screen.getByLabelText('親密度スライダー');
      // fireEvent で input イベントを発火してスライダー値を変更
      fireEvent.change(slider, { target: { value: '0.5' } });

      const { predicates } = useGraphStore.getState().edgeFilter;
      const pred = predicates.find((p) => p.type === 'closeness_gte');
      expect(pred).toEqual({ type: 'closeness_gte', value: 0.5 });
    });

    it('チェックボックスがOFFの場合、スライダーはdisabledになっている', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      const slider = screen.getByLabelText('親密度スライダー');
      expect(slider).toBeDisabled();
    });

    it('述語フィルタが有効な場合、「解除」ボタンが表示される', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      await user.click(screen.getByLabelText('親密度を有効化'));

      expect(screen.getByText('解除')).toBeInTheDocument();
    });

    it('述語フィルタが有効な状態で「解除」をクリックするとpredicatesが空になる', async () => {
      const user = userEvent.setup();
      render(<EdgeFilterPanel />);
      await user.click(screen.getByText('条件'));

      await user.click(screen.getByLabelText('親密度を有効化'));
      await user.click(screen.getByText('解除'));

      const { predicates } = useGraphStore.getState().edgeFilter;
      expect(predicates).toEqual([]);
    });
  });

  describe('複数関係のタグ集計', () => {
    beforeEach(() => {
      const store = useGraphStore.getState();
      store.addPerson({ name: '山田太郎' });
      store.addPerson({ name: '佐藤花子' });
      store.addPerson({ name: '鈴木次郎' });
      // addPerson後に再取得することで最新のpersonsを参照する
      const [p1, p2, p3] = useGraphStore.getState().persons;

      store.addRelationship({
        sourcePersonId: p1.id,
        targetPersonId: p2.id,
        isDirected: false,
        forward: { label: null, affection: null, awareness: null, role: null },
        reverse: { label: null, affection: null, awareness: null, role: null },
        symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
        tags: ['上司'],
        narrative: { summary: null, notes: null, turningPoints: [] },
        colorOverride: null,
      });

      store.addRelationship({
        sourcePersonId: p1.id,
        targetPersonId: p3.id,
        isDirected: false,
        forward: { label: null, affection: null, awareness: null, role: null },
        reverse: { label: null, affection: null, awareness: null, role: null },
        symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
        tags: ['友人', '上司'],
        narrative: { summary: null, notes: null, turningPoints: [] },
        colorOverride: null,
      });
    });

    it('複数の関係に同じタグが存在しても、チェックボックスは1つだけ表示される（重複排除）', () => {
      render(<EdgeFilterPanel />);

      // '上司' は2つの関係に存在するが、チェックボックスは1つ
      const 上司checkboxes = screen.getAllByLabelText('上司');
      expect(上司checkboxes).toHaveLength(1);
    });

    it('相関図全体に存在するすべてのユニークタグがチェックボックスとして表示される', () => {
      render(<EdgeFilterPanel />);

      expect(screen.getByLabelText('上司')).toBeInTheDocument();
      expect(screen.getByLabelText('友人')).toBeInTheDocument();
    });
  });
});
