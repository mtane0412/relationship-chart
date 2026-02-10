/**
 * MiniSidebarコンポーネントのテスト
 * パネル閉じた状態で表示されるミニマムなアイコンバー
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { MiniSidebar } from './MiniSidebar';
import { useGraphStore } from '@/stores/useGraphStore';

describe('MiniSidebar', () => {
  beforeEach(() => {
    // 各テスト前にLocalStorageをクリア
    localStorage.clear();

    // ストアをリセット
    const store = useGraphStore.getState();
    store.persons.forEach((person) => {
      store.removePerson(person.id);
    });
    store.relationships.forEach((relationship) => {
      store.removeRelationship(relationship.id);
    });
    store.clearSelection();
  });

  describe('無選択時', () => {
    it('すべての人物と物のアイコンが表示される', () => {
      const store = useGraphStore.getState();

      // 人物と物を追加
      store.addPerson({
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,person1',
        kind: 'person',
      });
      store.addPerson({
        name: '伝説の剣',
        imageDataUrl: 'data:image/jpeg;base64,item1',
        kind: 'item',
      });

      render(
        <ReactFlowProvider>
          <MiniSidebar />
        </ReactFlowProvider>
      );

      // 2つのアイコンが表示される
      const icons = screen.getAllByRole('button');
      // 開閉ボタン + 2つのノードアイコン = 3つ
      expect(icons).toHaveLength(3);
    });

    it('人物アイコンをクリックするとその人物が選択される', async () => {
      const user = userEvent.setup();
      const store = useGraphStore.getState();

      // 人物を追加
      store.addPerson({
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,person1',
        kind: 'person',
      });

      // 状態を再取得
      const personId = useGraphStore.getState().persons[0].id;

      render(
        <ReactFlowProvider>
          <MiniSidebar />
        </ReactFlowProvider>
      );

      // アイコンをクリック（開閉ボタン以外の最初のボタン）
      const icons = screen.getAllByRole('button');
      const personIcon = icons[1]; // 0番目は開閉ボタン

      await user.click(personIcon);

      // 人物が選択される
      expect(useGraphStore.getState().selectedPersonIds).toEqual([personId]);
    });
  });

  describe('ノード選択時', () => {
    it('選択されたノードと関係ノードのアイコンが表示される', () => {
      const store = useGraphStore.getState();

      // 3人の人物を追加
      store.addPerson({
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,person1',
      });
      store.addPerson({
        name: '佐藤花子',
        imageDataUrl: 'data:image/jpeg;base64,person2',
      });
      store.addPerson({
        name: '鈴木一郎',
        imageDataUrl: 'data:image/jpeg;base64,person3',
      });

      // 状態を再取得
      const persons = useGraphStore.getState().persons;
      const personId1 = persons[0].id;
      const personId2 = persons[1].id;

      // 山田太郎と佐藤花子の間に関係を追加
      store.addRelationship({
        sourcePersonId: personId1,
        targetPersonId: personId2,
        isDirected: false,
        sourceToTargetLabel: '友人',
        targetToSourceLabel: '友人',
      });

      // 山田太郎を選択
      store.selectPerson(personId1);

      render(
        <ReactFlowProvider>
          <MiniSidebar />
        </ReactFlowProvider>
      );

      // 選択されたノード（山田太郎）+ 関係ノード（佐藤花子）= 2つ
      const icons = screen.getAllByRole('button');
      // 開閉ボタン + 2つのノードアイコン = 3つ
      expect(icons).toHaveLength(3);
    });
  });

  describe('開閉ボタン', () => {
    it('開閉ボタンが表示される', () => {
      render(
        <ReactFlowProvider>
          <MiniSidebar />
        </ReactFlowProvider>
      );

      // aria-labelで開閉ボタンを特定
      const toggleButton = screen.getByLabelText('サイドパネルを開く');
      expect(toggleButton).toBeInTheDocument();
    });

    it('開閉ボタンをクリックするとsidePanelOpenがtrueになる', async () => {
      const user = userEvent.setup();
      const store = useGraphStore.getState();

      // 初期状態でパネルを閉じる
      store.setSidePanelOpen(false);

      render(
        <ReactFlowProvider>
          <MiniSidebar />
        </ReactFlowProvider>
      );

      const toggleButton = screen.getByLabelText('サイドパネルを開く');

      await user.click(toggleButton);

      // パネルが開く
      expect(useGraphStore.getState().sidePanelOpen).toBe(true);
    });
  });
});
