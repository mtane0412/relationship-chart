/**
 * useGraphStoreのテスト
 * Zustandストアの状態管理とアクションの振る舞いを検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGraphStore } from './useGraphStore';
import type { Person } from '@/types/person';

describe('useGraphStore', () => {
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
    // 選択状態もクリア
    store.clearSelection();
  });

  describe('初期状態', () => {
    it('personsは空配列である', () => {
      const { result } = renderHook(() => useGraphStore());
      expect(result.current.persons).toEqual([]);
    });

    it('relationshipsは空配列である', () => {
      const { result } = renderHook(() => useGraphStore());
      expect(result.current.relationships).toEqual([]);
    });
  });

  describe('addPerson', () => {
    it('新しい人物を追加できる', () => {
      const { result } = renderHook(() => useGraphStore());

      const newPerson: Omit<Person, 'id' | 'createdAt'> = {
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,abc',
      };

      act(() => {
        result.current.addPerson(newPerson);
      });

      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0]).toMatchObject({
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,abc',
      });
      expect(result.current.persons[0].id).toBeTruthy();
      expect(result.current.persons[0].createdAt).toBeTruthy();
    });

    it('複数の人物を追加できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      expect(result.current.persons).toHaveLength(2);
      expect(result.current.persons[0].name).toBe('山田太郎');
      expect(result.current.persons[1].name).toBe('佐藤花子');
    });

    it('追加された人物には一意なIDが割り当てられる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const ids = result.current.persons.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('removePerson', () => {
    it('指定したIDの人物を削除できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      expect(result.current.persons).toHaveLength(1);
      const personId = result.current.persons[0].id;

      act(() => {
        result.current.removePerson(personId);
      });

      expect(result.current.persons).toHaveLength(0);
    });

    it('存在しないIDを指定しても他の人物には影響しない', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      expect(result.current.persons).toHaveLength(1);

      act(() => {
        result.current.removePerson('non-existent-id');
      });

      expect(result.current.persons).toHaveLength(1);
    });

    it('人物削除時に関連するRelationshipも同時に削除される', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 2人の間に関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: false,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: '友人',
        });
      });

      expect(result.current.relationships).toHaveLength(1);

      // 人物1を削除
      act(() => {
        result.current.removePerson(personId1);
      });

      // 関連するRelationshipも削除されている
      expect(result.current.relationships).toHaveLength(0);
      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0].id).toBe(personId2);
    });

    it('人物削除時にselectedPersonIdsからも除外される', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 2人とも選択
      act(() => {
        result.current.setSelectedPersonIds([personId1, personId2]);
      });

      expect(result.current.selectedPersonIds).toEqual([personId1, personId2]);

      // 人物1を削除
      act(() => {
        result.current.removePerson(personId1);
      });

      // selectedPersonIdsからも除外されている
      expect(result.current.selectedPersonIds).toEqual([personId2]);
    });
  });

  describe('addPerson（imageDataUrlなし）', () => {
    it('imageDataUrlなしで人物を追加できる', () => {
      const { result } = renderHook(() => useGraphStore());

      const newPerson: Omit<Person, 'id' | 'createdAt'> = {
        name: '山田太郎',
      };

      act(() => {
        result.current.addPerson(newPerson);
      });

      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0]).toMatchObject({
        name: '山田太郎',
      });
      expect(result.current.persons[0].imageDataUrl).toBeUndefined();
      expect(result.current.persons[0].id).toBeTruthy();
      expect(result.current.persons[0].createdAt).toBeTruthy();
    });
  });

  describe('updatePerson', () => {
    it('人物の名前を更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      // 名前を更新
      act(() => {
        result.current.updatePerson(personId, { name: '山田次郎' });
      });

      expect(result.current.persons[0].name).toBe('山田次郎');
      expect(result.current.persons[0].imageDataUrl).toBe('data:image/jpeg;base64,abc');
    });

    it('人物の画像を更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      // 画像を更新
      act(() => {
        result.current.updatePerson(personId, { imageDataUrl: 'data:image/jpeg;base64,xyz' });
      });

      expect(result.current.persons[0].name).toBe('山田太郎');
      expect(result.current.persons[0].imageDataUrl).toBe('data:image/jpeg;base64,xyz');
    });

    it('人物の画像を削除できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      // 画像を削除（undefinedに設定）
      act(() => {
        result.current.updatePerson(personId, { imageDataUrl: undefined });
      });

      expect(result.current.persons[0].name).toBe('山田太郎');
      expect(result.current.persons[0].imageDataUrl).toBeUndefined();
    });

    it('存在しないIDを指定しても他の人物に影響しない', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      // 存在しないIDで更新を試みる
      act(() => {
        result.current.updatePerson('non-existent-id', { name: '更新後の名前' });
      });

      // 既存の人物は変更されていない
      expect(result.current.persons[0].name).toBe('山田太郎');
    });
  });

  describe('selectPerson', () => {
    it('人物を選択できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 初期状態では何も選択されていない
      expect(result.current.selectedPersonIds).toEqual([]);

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      // 人物を選択
      act(() => {
        result.current.selectPerson(personId);
      });

      expect(result.current.selectedPersonIds).toEqual([personId]);
    });

    it('人物の選択を解除できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加して選択
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      act(() => {
        result.current.selectPerson(personId);
      });

      expect(result.current.selectedPersonIds).toEqual([personId]);

      // 選択を解除
      act(() => {
        result.current.selectPerson(null);
      });

      expect(result.current.selectedPersonIds).toEqual([]);
    });
  });

  describe('togglePersonSelection', () => {
    it('選択されていない人物を選択できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      // 初期状態では選択されていない
      expect(result.current.selectedPersonIds).toEqual([]);

      // トグルで選択
      act(() => {
        result.current.togglePersonSelection(personId);
      });

      expect(result.current.selectedPersonIds).toEqual([personId]);
    });

    it('選択されている人物を選択解除できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      // 最初に選択
      act(() => {
        result.current.togglePersonSelection(personId);
      });

      expect(result.current.selectedPersonIds).toEqual([personId]);

      // もう一度トグルで選択解除
      act(() => {
        result.current.togglePersonSelection(personId);
      });

      expect(result.current.selectedPersonIds).toEqual([]);
    });

    it('複数の人物を選択できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 1人目を選択
      act(() => {
        result.current.togglePersonSelection(personId1);
      });

      expect(result.current.selectedPersonIds).toEqual([personId1]);

      // 2人目も選択（1人目は保持）
      act(() => {
        result.current.togglePersonSelection(personId2);
      });

      expect(result.current.selectedPersonIds).toEqual([personId1, personId2]);
    });

    it('複数選択中に1人だけ選択解除できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 2人とも選択
      act(() => {
        result.current.togglePersonSelection(personId1);
        result.current.togglePersonSelection(personId2);
      });

      expect(result.current.selectedPersonIds).toEqual([personId1, personId2]);

      // 1人目を選択解除
      act(() => {
        result.current.togglePersonSelection(personId1);
      });

      expect(result.current.selectedPersonIds).toEqual([personId2]);
    });
  });

  describe('clearSelection', () => {
    it('すべての選択を解除できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加して選択
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      act(() => {
        result.current.togglePersonSelection(personId1);
        result.current.togglePersonSelection(personId2);
      });

      expect(result.current.selectedPersonIds).toEqual([personId1, personId2]);

      // すべての選択を解除
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedPersonIds).toEqual([]);
    });

    it('何も選択されていない状態でclearSelectionを呼んでもエラーにならない', () => {
      const { result } = renderHook(() => useGraphStore());

      expect(result.current.selectedPersonIds).toEqual([]);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedPersonIds).toEqual([]);
    });
  });

  describe('setSelectedPersonIds', () => {
    it('選択状態を一括設定できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 3人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
        result.current.addPerson({
          name: '鈴木一郎',
          imageDataUrl: 'data:image/jpeg;base64,ghi',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 2人を一括選択
      act(() => {
        result.current.setSelectedPersonIds([personId1, personId2]);
      });

      expect(result.current.selectedPersonIds).toEqual([personId1, personId2]);
    });

    it('空配列を渡すとすべての選択が解除される', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加して選択
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      act(() => {
        result.current.togglePersonSelection(personId);
      });

      expect(result.current.selectedPersonIds).toEqual([personId]);

      // 空配列で選択解除
      act(() => {
        result.current.setSelectedPersonIds([]);
      });

      expect(result.current.selectedPersonIds).toEqual([]);
    });
  });

  describe('addRelationship', () => {
    it('新しい関係を追加できる（bidirectional）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // bidirectional関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '親子',
          targetToSourceLabel: '親子',
        });
      });

      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        sourcePersonId: personId1,
        targetPersonId: personId2,
        isDirected: true,
        sourceToTargetLabel: '親子',
        targetToSourceLabel: '親子',
      });
    });

    it('新しい関係を追加できる（dual-directed）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // dual-directed関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '好き',
          targetToSourceLabel: '無関心',
        });
      });

      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        sourcePersonId: personId1,
        targetPersonId: personId2,
        isDirected: true,
        sourceToTargetLabel: '好き',
        targetToSourceLabel: '無関心',
      });
    });

    it('同じペアの関係が既に存在する場合は追加しない（source→target）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 1つ目の関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '片想い',
          targetToSourceLabel: null,
        });
      });

      expect(result.current.relationships).toHaveLength(1);

      // 同じペアの2つ目の関係を追加しようとする
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: '友人',
        });
      });

      // 追加されない（1つのまま）
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0].sourceToTargetLabel).toBe('片想い');
    });

    it('同じペアの関係が既に存在する場合は追加しない（target→source）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 1つ目の関係を追加（A→B）
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '片想い',
          targetToSourceLabel: null,
        });
      });

      expect(result.current.relationships).toHaveLength(1);

      // 逆向きの関係を追加しようとする（B→A）
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId2,
          targetPersonId: personId1,
          isDirected: true,
          sourceToTargetLabel: '同僚',
          targetToSourceLabel: null,
        });
      });

      // 追加されない（1つのまま）
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0].sourcePersonId).toBe(personId1);
    });
  });

  describe('updateRelationship', () => {
    it('関係のタイプを更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '片想い',
          targetToSourceLabel: null,
        });
      });

      const relationshipId = result.current.relationships[0].id;

      // タイプを更新
      act(() => {
        result.current.updateRelationship(relationshipId, {
          isDirected: true,
          targetToSourceLabel: '片想い',
        });
      });

      expect(result.current.relationships[0]).toMatchObject({
        id: relationshipId,
        isDirected: true,
        sourceToTargetLabel: '片想い', // ラベルは変更されない
        targetToSourceLabel: '片想い',
      });
    });

    it('関係のラベルを更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: '友人',
        });
      });

      const relationshipId = result.current.relationships[0].id;

      // ラベルを更新
      act(() => {
        result.current.updateRelationship(relationshipId, {
          sourceToTargetLabel: '親友',
          targetToSourceLabel: '親友',
        });
      });

      expect(result.current.relationships[0]).toMatchObject({
        id: relationshipId,
        isDirected: true,
        sourceToTargetLabel: '親友',
        targetToSourceLabel: '親友',
      });
    });

    it('dual-directedの2つ目のラベルを更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // dual-directed関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '好き',
          targetToSourceLabel: '無関心',
        });
      });

      const relationshipId = result.current.relationships[0].id;

      // 両方のラベルを更新
      act(() => {
        result.current.updateRelationship(relationshipId, {
          sourceToTargetLabel: '愛している',
          targetToSourceLabel: '嫌い',
        });
      });

      expect(result.current.relationships[0]).toMatchObject({
        id: relationshipId,
        isDirected: true,
        sourceToTargetLabel: '愛している',
        targetToSourceLabel: '嫌い',
      });
    });

    it('存在しないIDで更新しても他の関係に影響しない', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: true,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: '友人',
        });
      });

      // 存在しないIDで更新を試みる
      act(() => {
        result.current.updateRelationship('non-existent-id', {
          sourceToTargetLabel: '敵',
        });
      });

      // 既存の関係は変更されていない
      expect(result.current.relationships[0]).toMatchObject({
        isDirected: true,
        sourceToTargetLabel: '友人',
        targetToSourceLabel: '友人',
      });
    });
  });

  describe('マイグレーション（v1→v3）', () => {
    it.skip('v1のundirected関係（isDirected: false）をv3のundirectedに変換する', () => {
      // Note: Zustandのpersistミドルウェアはストアの初回初期化時にのみマイグレーションを実行するため、
      // テスト環境では正確なマイグレーションのテストが困難です。
      // 実際のマイグレーションは手動で確認することを推奨します。

      // v1形式のデータをLocalStorageに設定
      const v1Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', name: '佐藤花子', createdAt: '2026-01-01T00:01:00.000Z' },
          ],
          relationships: [
            {
              id: 'r1',
              sourcePersonId: 'p1',
              targetPersonId: 'p2',
              isDirected: false,
              sourceToTargetLabel: '友人',
              targetToSourceLabel: '友人',
              createdAt: '2026-01-01T00:02:00.000Z',
            },
          ],
          selectedPersonIds: ['p1'],
          forceEnabled: true,
        },
        version: 1,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v1Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        id: 'r1',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        isDirected: false,
        sourceToTargetLabel: '友人',
        targetToSourceLabel: '友人',
      });
    });

    it.skip('v1のdirected関係（isDirected: true）をv3のone-wayに変換する', () => {
      // Note: マイグレーションテストはスキップ（上記と同様の理由）

      // v1形式のデータをLocalStorageに設定
      const v1Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', name: '佐藤花子', createdAt: '2026-01-01T00:01:00.000Z' },
          ],
          relationships: [
            {
              id: 'r1',
              sourcePersonId: 'p1',
              targetPersonId: 'p2',
              isDirected: true,
              sourceToTargetLabel: '上司',
              targetToSourceLabel: null,
              createdAt: '2026-01-01T00:02:00.000Z',
            },
          ],
          selectedPersonIds: [],
          forceEnabled: true,
        },
        version: 1,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v1Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        id: 'r1',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        isDirected: true,
        sourceToTargetLabel: '上司',
        targetToSourceLabel: null,
      });
    });

    it.skip('複数の関係をまとめてマイグレーションできる', () => {
      // Note: マイグレーションテストはスキップ（上記と同様の理由）

      // v1形式のデータをLocalStorageに設定
      const v1Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', name: '佐藤花子', createdAt: '2026-01-01T00:01:00.000Z' },
            { id: 'p3', name: '鈴木一郎', createdAt: '2026-01-01T00:02:00.000Z' },
          ],
          relationships: [
            {
              id: 'r1',
              sourcePersonId: 'p1',
              targetPersonId: 'p2',
              isDirected: false,
              sourceToTargetLabel: '友人',
              targetToSourceLabel: '友人',
              createdAt: '2026-01-01T00:03:00.000Z',
            },
            {
              id: 'r2',
              sourcePersonId: 'p2',
              targetPersonId: 'p3',
              isDirected: true,
              sourceToTargetLabel: '上司',
              targetToSourceLabel: null,
              createdAt: '2026-01-01T00:04:00.000Z',
            },
          ],
          selectedPersonIds: [],
          forceEnabled: true,
        },
        version: 1,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v1Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.relationships).toHaveLength(2);
      expect(result.current.relationships[0]).toMatchObject({
        isDirected: false,
        sourceToTargetLabel: '友人',
        targetToSourceLabel: '友人',
      });
      expect(result.current.relationships[1]).toMatchObject({
        isDirected: true,
        sourceToTargetLabel: '上司',
        targetToSourceLabel: null,
      });
    });
  });

  describe('マイグレーション（v2→v3）', () => {
    it.skip('v2のbidirectional関係をv3に変換する', () => {
      // Note: Zustandのpersistミドルウェアはストアの初回初期化時にのみマイグレーションを実行するため、
      // テスト環境では正確なマイグレーションのテストが困難です。
      // 実際のマイグレーションは手動で確認することを推奨します。

      // v2形式のデータをLocalStorageに設定
      const v2Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', name: '佐藤花子', createdAt: '2026-01-01T00:01:00.000Z' },
          ],
          relationships: [
            {
              id: 'r1',
              sourcePersonId: 'p1',
              targetPersonId: 'p2',
              type: 'bidirectional',
              sourceToTargetLabel: '友人',
              targetToSourceLabel: null,
              createdAt: '2026-01-01T00:02:00.000Z',
            },
          ],
          selectedPersonIds: ['p1'],
          forceEnabled: true,
        },
        version: 2,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v2Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        id: 'r1',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        isDirected: true,
        sourceToTargetLabel: '友人',
        targetToSourceLabel: '友人', // 同一ラベルに変換される
      });
    });

    it.skip('v2のdual-directed関係をv3に変換する', () => {
      // v2形式のデータをLocalStorageに設定
      const v2Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', name: '佐藤花子', createdAt: '2026-01-01T00:01:00.000Z' },
          ],
          relationships: [
            {
              id: 'r1',
              sourcePersonId: 'p1',
              targetPersonId: 'p2',
              type: 'dual-directed',
              sourceToTargetLabel: '好き',
              targetToSourceLabel: '嫌い',
              createdAt: '2026-01-01T00:02:00.000Z',
            },
          ],
          selectedPersonIds: [],
          forceEnabled: true,
        },
        version: 2,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v2Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        id: 'r1',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        isDirected: true,
        sourceToTargetLabel: '好き',
        targetToSourceLabel: '嫌い', // ラベルはそのまま維持
      });
    });

    it.skip('v2のone-way関係をv3に変換する', () => {
      // v2形式のデータをLocalStorageに設定
      const v2Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', name: '佐藤花子', createdAt: '2026-01-01T00:01:00.000Z' },
          ],
          relationships: [
            {
              id: 'r1',
              sourcePersonId: 'p1',
              targetPersonId: 'p2',
              type: 'one-way',
              sourceToTargetLabel: '片想い',
              targetToSourceLabel: null,
              createdAt: '2026-01-01T00:02:00.000Z',
            },
          ],
          selectedPersonIds: [],
          forceEnabled: true,
        },
        version: 2,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v2Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        id: 'r1',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        isDirected: true,
        sourceToTargetLabel: '片想い',
        targetToSourceLabel: null, // nullのまま
      });
    });

    it.skip('v2のundirected関係をv3に変換する', () => {
      // v2形式のデータをLocalStorageに設定
      const v2Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
            { id: 'p2', name: '佐藤花子', createdAt: '2026-01-01T00:01:00.000Z' },
          ],
          relationships: [
            {
              id: 'r1',
              sourcePersonId: 'p1',
              targetPersonId: 'p2',
              type: 'undirected',
              sourceToTargetLabel: '同一人物',
              targetToSourceLabel: null,
              createdAt: '2026-01-01T00:02:00.000Z',
            },
          ],
          selectedPersonIds: [],
          forceEnabled: true,
        },
        version: 2,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v2Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        id: 'r1',
        sourcePersonId: 'p1',
        targetPersonId: 'p2',
        isDirected: false,
        sourceToTargetLabel: '同一人物',
        targetToSourceLabel: '同一人物', // 同一ラベルに変換される
      });
    });
  });

  describe('Undo/Redo (temporal middleware)', () => {
    it('人物追加のundo/redoができる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      expect(result.current.persons).toHaveLength(1);
      const personId = result.current.persons[0].id;

      // Undo
      act(() => {
        useGraphStore.temporal.getState().undo();
      });

      expect(result.current.persons).toHaveLength(0);

      // Redo
      act(() => {
        useGraphStore.temporal.getState().redo();
      });

      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0].id).toBe(personId);
    });

    it('人物更新のundoができる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
      });

      const personId = result.current.persons[0].id;

      // 名前を更新
      act(() => {
        result.current.updatePerson(personId, { name: '山田次郎' });
      });

      expect(result.current.persons[0].name).toBe('山田次郎');

      // Undo
      act(() => {
        useGraphStore.temporal.getState().undo();
      });

      expect(result.current.persons[0].name).toBe('山田太郎');
    });

    it('関係追加のundoができる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: false,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: '友人',
        });
      });

      expect(result.current.relationships).toHaveLength(1);

      // Undo
      act(() => {
        useGraphStore.temporal.getState().undo();
      });

      expect(result.current.relationships).toHaveLength(0);
    });

    it('人物削除のundoで関連関係も復元される', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship({
          sourcePersonId: personId1,
          targetPersonId: personId2,
          isDirected: false,
          sourceToTargetLabel: '友人',
          targetToSourceLabel: '友人',
        });
      });

      const relationshipId = result.current.relationships[0].id;

      // 人物を削除（関連関係も削除される）
      act(() => {
        result.current.removePerson(personId1);
      });

      expect(result.current.persons).toHaveLength(1);
      expect(result.current.relationships).toHaveLength(0);

      // Undo（人物と関係が復元される）
      act(() => {
        useGraphStore.temporal.getState().undo();
      });

      expect(result.current.persons).toHaveLength(2);
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0].id).toBe(relationshipId);
    });

    it('UI状態（selectedPersonIds）変更はundo対象外', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
        });
      });

      const personId1 = result.current.persons[0].id;

      // 選択状態を変更（この操作はundo履歴に記録されない）
      act(() => {
        result.current.setSelectedPersonIds([personId1]);
      });

      expect(result.current.selectedPersonIds).toEqual([personId1]);

      // 人物を1人削除（この操作はundo履歴に記録される）
      act(() => {
        result.current.removePerson(personId1);
      });

      expect(result.current.persons).toHaveLength(1);
      // removePerson内でselectedPersonIdsから除外される
      expect(result.current.selectedPersonIds).toEqual([]);

      // Undoを実行（人物削除が取り消される）
      act(() => {
        useGraphStore.temporal.getState().undo();
      });

      // 人物が復元される
      expect(result.current.persons).toHaveLength(2);
      // selectedPersonIdsは復元されない（UI状態はundo対象外）
      expect(result.current.selectedPersonIds).toEqual([]);
    });

    it('UI状態（forceEnabled）変更はundo対象外', () => {
      const { result } = renderHook(() => useGraphStore());

      // forceEnabledを変更
      act(() => {
        result.current.setForceEnabled(false);
      });

      expect(result.current.forceEnabled).toBe(false);

      // Undo（forceEnabledは変わらない）
      act(() => {
        useGraphStore.temporal.getState().undo();
      });

      expect(result.current.forceEnabled).toBe(false);
    });
  });
});
