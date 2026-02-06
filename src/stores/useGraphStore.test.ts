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
    // 各テスト前にストアをリセット
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
});
