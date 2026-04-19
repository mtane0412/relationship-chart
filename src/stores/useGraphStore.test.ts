/**
 * useGraphStoreのテスト
 * Zustandストアの状態管理とアクションの振る舞いを検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGraphStore } from './useGraphStore';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import { initDB, closeDB } from '@/lib/chart-db';

/**
 * テスト用のv11形式の関係オブジェクトを生成するヘルパー関数
 * 最小限の必須フィールドのみ指定し、残りはデフォルト値を設定する
 */
function makeRel(
  overrides: Partial<Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>> & {
    sourceId: string;
    targetId: string;
  }
): Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    sourceId: overrides.sourceId,
    targetId: overrides.targetId,
    type: overrides.type ?? '関係',
    label: overrides.label ?? null,
    symmetric: overrides.symmetric ?? false,
    tags: overrides.tags ?? [],
    narrative: overrides.narrative ?? {
      summary: null,
      notes: null,
      turningPoints: [],
    },
    colorOverride: overrides.colorOverride ?? null,
    properties: overrides.properties ?? {},
  };
}

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
    // forceParamsもリセット
    store.resetForceParams();
    // egoLayoutParamsもリセット
    store.resetEgoLayoutParams();
    // sidePanelOpenもリセット
    store.setSidePanelOpen(true);
    // edgeFilterもリセット
    store.updateEdgeFilter({ tags: { mode: 'any', values: [] }, predicates: [] });
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
        labels: ['人物'],
        properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 2人の間に関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '友人',
              label: '友人',
              symmetric: true,
            })
          );
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
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
        labels: ['人物'],
        properties: {},
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

  describe('addPerson（labels指定）', () => {
    it('labels: ["人物"]を指定して人物を追加できる', () => {
      const { result } = renderHook(() => useGraphStore());

      const newPerson: Omit<Person, 'id' | 'createdAt'> = {
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,abc',
        labels: ['人物'],
        properties: {},
      };

      act(() => {
        result.current.addPerson(newPerson);
      });

      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0]).toMatchObject({
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,abc',
        labels: ['人物'],
      });
      expect(result.current.persons[0].id).toBeTruthy();
      expect(result.current.persons[0].createdAt).toBeTruthy();
    });

    it('labels: ["物"]を指定して物を追加できる', () => {
      const { result } = renderHook(() => useGraphStore());

      const newItem: Omit<Person, 'id' | 'createdAt'> = {
        name: '伝説の剣',
        imageDataUrl: 'data:image/jpeg;base64,sword',
        labels: ['物'],
        properties: {},
      };

      act(() => {
        result.current.addPerson(newItem);
      });

      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0]).toMatchObject({
        name: '伝説の剣',
        imageDataUrl: 'data:image/jpeg;base64,sword',
        labels: ['物'],
      });
      expect(result.current.persons[0].id).toBeTruthy();
      expect(result.current.persons[0].createdAt).toBeTruthy();
    });

    it('labels: []（空配列）を指定した場合は空配列のまま保存される', () => {
      const { result } = renderHook(() => useGraphStore());

      const newPerson: Omit<Person, 'id' | 'createdAt'> = {
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,abc',
        labels: [],
        properties: {},
      };

      act(() => {
        result.current.addPerson(newPerson);
      });

      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0]).toMatchObject({
        name: '山田太郎',
        imageDataUrl: 'data:image/jpeg;base64,abc',
      });
      // labelsは空配列のまま保存される
      expect(result.current.persons[0].labels).toEqual([]);
    });

    it('人物と物を混在させて追加できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '魔法の杖',
          imageDataUrl: 'data:image/jpeg;base64,wand',
          labels: ['物'],
          properties: {},
        });
      });

      expect(result.current.persons).toHaveLength(2);
      expect(result.current.persons[0].labels).toEqual(['人物']);
      expect(result.current.persons[1].labels).toEqual(['物']);
    });
  });

  describe('removePerson（labels指定）', () => {
    it('物ノードを削除できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.addPerson({
          name: '伝説の剣',
          imageDataUrl: 'data:image/jpeg;base64,sword',
          labels: ['物'],
          properties: {},
        });
      });

      expect(result.current.persons).toHaveLength(1);
      const itemId = result.current.persons[0].id;

      act(() => {
        result.current.removePerson(itemId);
      });

      expect(result.current.persons).toHaveLength(0);
    });

    it('物ノード削除時に関連するRelationshipも同時に削除される', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物と物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '伝説の剣',
          imageDataUrl: 'data:image/jpeg;base64,sword',
          labels: ['物'],
          properties: {},
        });
      });

      const personId = result.current.persons[0].id;
      const itemId = result.current.persons[1].id;

      // 人物と物の間に関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId,
              targetId: itemId,
              type: '所有',
              label: '所有',
              symmetric: false,
            })
          );
      });

      expect(result.current.relationships).toHaveLength(1);

      // 物を削除
      act(() => {
        result.current.removePerson(itemId);
      });

      // 関連するRelationshipも削除されている
      expect(result.current.relationships).toHaveLength(0);
      expect(result.current.persons).toHaveLength(1);
      expect(result.current.persons[0].id).toBe(personId);
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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

  describe('updatePersonPositions', () => {
    it('複数人のノード位置を一括更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 3人の人物を追加
      act(() => {
        result.current.addPerson({ name: '山田太郎', labels: ['人物'], properties: {} });
        result.current.addPerson({ name: '佐藤花子', labels: ['人物'], properties: {} });
        result.current.addPerson({ name: '鈴木一郎', labels: ['人物'], properties: {} });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;
      const personId3 = result.current.persons[2].id;

      // 初期状態では位置は未設定
      expect(result.current.persons[0].position).toBeUndefined();
      expect(result.current.persons[1].position).toBeUndefined();
      expect(result.current.persons[2].position).toBeUndefined();

      // 複数人の位置を一括更新
      const positions = new Map<string, { x: number; y: number }>([
        [personId1, { x: 100, y: 200 }],
        [personId2, { x: 300, y: 400 }],
        [personId3, { x: 500, y: 600 }],
      ]);

      act(() => {
        result.current.updatePersonPositions(positions);
      });

      // 位置が更新されている
      expect(result.current.persons[0].position).toEqual({ x: 100, y: 200 });
      expect(result.current.persons[1].position).toEqual({ x: 300, y: 400 });
      expect(result.current.persons[2].position).toEqual({ x: 500, y: 600 });
    });

    it('存在しないIDを含むMapでも他のpersonに影響しない', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({ name: '山田太郎', labels: ['人物'], properties: {} });
        result.current.addPerson({ name: '佐藤花子', labels: ['人物'], properties: {} });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 存在しないIDを含むMapで更新
      const positions = new Map<string, { x: number; y: number }>([
        [personId1, { x: 100, y: 200 }],
        ['non-existent-id', { x: 999, y: 999 }],
        [personId2, { x: 300, y: 400 }],
      ]);

      act(() => {
        result.current.updatePersonPositions(positions);
      });

      // 存在するpersonの位置は更新されている
      expect(result.current.persons[0].position).toEqual({ x: 100, y: 200 });
      expect(result.current.persons[1].position).toEqual({ x: 300, y: 400 });
      // エラーは発生せず、他のpersonに影響しない
      expect(result.current.persons).toHaveLength(2);
    });

    it('位置未設定のpersonに位置を設定できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 位置未設定で人物を追加
      act(() => {
        result.current.addPerson({ name: '山田太郎', labels: ['人物'], properties: {} });
      });

      const personId = result.current.persons[0].id;

      // 初期状態では位置は未設定
      expect(result.current.persons[0].position).toBeUndefined();

      // 位置を設定
      const positions = new Map<string, { x: number; y: number }>([[personId, { x: 150, y: 250 }]]);

      act(() => {
        result.current.updatePersonPositions(positions);
      });

      // 位置が設定されている
      expect(result.current.persons[0].position).toEqual({ x: 150, y: 250 });
    });

    it('既に位置が設定されているpersonの位置を更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          position: { x: 100, y: 100 },
          labels: ['人物'],
          properties: {},
        });
      });

      const personId = result.current.persons[0].id;

      // 初期位置を確認
      expect(result.current.persons[0].position).toEqual({ x: 100, y: 100 });

      // 位置を更新
      const positions = new Map<string, { x: number; y: number }>([[personId, { x: 200, y: 300 }]]);

      act(() => {
        result.current.updatePersonPositions(positions);
      });

      // 位置が更新されている
      expect(result.current.persons[0].position).toEqual({ x: 200, y: 300 });
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '鈴木一郎',
          imageDataUrl: 'data:image/jpeg;base64,ghi',
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 無向表示の関係を追加（symmetric: true）
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '親子',
              label: '親子',
              symmetric: true,
            })
          );
      });

      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        sourceId: personId1,
        targetId: personId2,
        type: '親子',
        label: '親子',
        symmetric: true,
      });
    });

    it('新しい関係を追加できる（dual-directed）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 有向関係を追加（symmetric: false）
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '好き',
              label: '好き',
              symmetric: false,
            })
          );
      });

      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.relationships[0]).toMatchObject({
        sourceId: personId1,
        targetId: personId2,
        type: '好き',
        label: '好き',
        symmetric: false,
      });
    });

    it('同じペアへ2回addRelationshipを呼ぶと2つのエッジが作成される（v11マルチグラフ）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 1つ目の関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '片想い',
              label: '片想い',
              symmetric: false,
            })
          );
      });

      expect(result.current.relationships).toHaveLength(1);

      // 同じペアに別の関係を追加（v11ではマルチグラフ：追加される）
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '友人',
              label: '友人',
              symmetric: true,
            })
          );
      });

      // v11ではマージされず2つのエッジが作成される
      expect(result.current.relationships).toHaveLength(2);
      expect(result.current.relationships[0].type).toBe('片想い');
      expect(result.current.relationships[1].type).toBe('友人');
    });

    it('逆向きの関係も独立して追加される（v11マルチグラフ）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // A→B の関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '片想い',
              label: '片想い',
              symmetric: false,
            })
          );
      });

      expect(result.current.relationships).toHaveLength(1);

      // B→A の逆向きの関係を追加（v11では独立エッジとして追加される）
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId2,
              targetId: personId1,
              type: '同僚',
              label: '同僚',
              symmetric: false,
            })
          );
      });

      // v11ではマージされず2つのエッジが作成される
      expect(result.current.relationships).toHaveLength(2);
      expect(result.current.relationships[0].sourceId).toBe(personId1);
      expect(result.current.relationships[1].sourceId).toBe(personId2);
    });

    it('タグなしで関係を追加できる（v11ではlayerの代わりにtagsを使用）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // タグを指定せず関係を追加
      act(() => {
        result.current.addRelationship(
          makeRel({
            sourceId: personId1,
            targetId: personId2,
            type: '同僚',
            label: '同僚',
            symmetric: true,
          })
        );
      });

      // v11ではlayerフィールドはなく、tagsが空配列であることを確認
      expect(result.current.relationships[0].tags).toEqual([]);
    });

    it('同じペアへの複数回addRelationshipはそれぞれ独立したエッジを作成する（v11マルチグラフ）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '江戸川コナン',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '毛利蘭',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 1つ目の関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '幼馴染',
              label: '幼馴染',
              symmetric: true,
            })
          );
      });

      expect(result.current.relationships).toHaveLength(1);

      // 同じペアに別の関係を追加（v11ではマルチグラフ：追加される）
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '好き',
              label: '好き',
              symmetric: false,
            })
          );
      });

      // v11ではマージされず2つのエッジが作成される
      expect(result.current.relationships).toHaveLength(2);
    });

    it('同じペアへの2度目のaddRelationshipで2つ目のエッジが作成される（v11マルチグラフ動作）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '江戸川コナン',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '灰原哀',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 最初の関係を追加（ラベル: 同居人・仲間）
      act(() => {
        result.current.addRelationship(
          makeRel({
            sourceId: personId1,
            targetId: personId2,
            type: '同居人・仲間',
            label: '同居人・仲間',
            symmetric: true,
          })
        );
      });

      // 同じペアへ追加（v11ではマルチグラフ：新エッジが作成される）
      act(() => {
        result.current.addRelationship(
          makeRel({
            sourceId: personId1,
            targetId: personId2,
            type: '信頼',
            label: '信頼',
            symmetric: false,
          })
        );
      });

      // v11ではマージされず2つのエッジが作成される
      expect(result.current.relationships).toHaveLength(2);
      // 2つ目のエッジが正しく追加されている
      expect(result.current.relationships[1].type).toBe('信頼');
      expect(result.current.relationships[1].symmetric).toBe(false);
    });

    it('tagsを指定して関係を追加できる（v11ではlayerの代わりにtagsを使用）', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '工藤新一',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '毛利蘭',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // tagsを指定して関係を追加
      act(() => {
        result.current.addRelationship(
          makeRel({
            sourceId: personId1,
            targetId: personId2,
            type: '想い人',
            label: '想い人',
            symmetric: false,
            tags: ['片想い'],
          })
          );
      });

      expect(result.current.relationships[0].tags).toContain('片想い');
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '片想い',
              label: '片想い',
              symmetric: false,
            })
          );
      });

      const relationshipId = result.current.relationships[0].id;

      // ラベルを更新（有向のまま）
      act(() => {
        result.current.updateRelationship(relationshipId, {
          label: '恋愛感情',
        });
      });

      expect(result.current.relationships[0]).toMatchObject({
        id: relationshipId,
        symmetric: false,
        // type は変更されないことを確認
        type: '片想い',
        label: '恋愛感情',
      });
    });

    it('関係のラベルを更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '友人',
              label: '友人',
              symmetric: true,
            })
          );
      });

      const relationshipId = result.current.relationships[0].id;

      // ラベルを更新
      act(() => {
        result.current.updateRelationship(relationshipId, {
          type: '親友',
          label: '親友',
        });
      });

      expect(result.current.relationships[0]).toMatchObject({
        id: relationshipId,
        symmetric: true,
        type: '親友',
        label: '親友',
      });
    });

    it('dual-directedの2つ目のラベルを更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 有向関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '好き',
              label: '好き',
              symmetric: false,
            })
          );
      });

      const relationshipId = result.current.relationships[0].id;

      // ラベルとタイプを更新
      act(() => {
        result.current.updateRelationship(relationshipId, {
          type: '愛している',
          label: '愛している',
        });
      });

      expect(result.current.relationships[0]).toMatchObject({
        id: relationshipId,
        symmetric: false,
        type: '愛している',
        label: '愛している',
      });
    });

    it('存在しないIDで更新しても他の関係に影響しない', () => {
      const { result } = renderHook(() => useGraphStore());

      // 2人の人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '友人',
              label: '友人',
              symmetric: true,
            })
          );
      });

      // 存在しないIDで更新を試みる
      act(() => {
        result.current.updateRelationship('non-existent-id', {
          label: '敵',
        });
      });

      // 既存の関係は変更されていない
      expect(result.current.relationships[0]).toMatchObject({
        symmetric: true,
        type: '友人',
        label: '友人',
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
              forward: { label: '友人' },
              reverse: { label: '友人' },
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
        forward: { label: '友人' },
        reverse: { label: '友人' },
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
              forward: { label: '上司' },
              reverse: { label: null },
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
        forward: { label: '上司' },
        reverse: { label: null },
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
              forward: { label: '友人' },
              reverse: { label: '友人' },
              createdAt: '2026-01-01T00:03:00.000Z',
            },
            {
              id: 'r2',
              sourcePersonId: 'p2',
              targetPersonId: 'p3',
              isDirected: true,
              forward: { label: '上司' },
              reverse: { label: null },
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
        forward: { label: '友人' },
        reverse: { label: '友人' },
      });
      expect(result.current.relationships[1]).toMatchObject({
        isDirected: true,
        forward: { label: '上司' },
        reverse: { label: null },
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
              forward: { label: '友人' },
              reverse: { label: null },
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
        forward: { label: '友人' },
        // 同一ラベルに変換される
        reverse: { label: '友人' }
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
              forward: { label: '好き' },
              reverse: { label: '嫌い' },
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
        forward: { label: '好き' },
        // ラベルはそのまま維持
        reverse: { label: '嫌い' }
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
              forward: { label: '片想い' },
              reverse: { label: null },
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
        forward: { label: '片想い' },
        // nullのまま
        reverse: { label: null }
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
              forward: { label: '同一人物' },
              reverse: { label: null },
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
        forward: { label: '同一人物' },
        // 同一ラベルに変換される
        reverse: { label: '同一人物' }
      });
    });
  });

  describe('forceParams', () => {
    it('初期状態でデフォルトのforceParamsが設定されている', () => {
      const { result } = renderHook(() => useGraphStore());

      expect(result.current.forceParams).toEqual({
        linkDistance: 150,
        linkStrength: 0.5,
        chargeStrength: -300,
      });
    });

    it('setForceParamsで個別パラメータを更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // linkDistanceのみ更新
      act(() => {
        result.current.setForceParams({ linkDistance: 200 });
      });

      expect(result.current.forceParams).toEqual({
        linkDistance: 200,
        linkStrength: 0.5,
        chargeStrength: -300,
      });

      // linkStrengthも更新
      act(() => {
        result.current.setForceParams({ linkStrength: 0.8 });
      });

      expect(result.current.forceParams).toEqual({
        linkDistance: 200,
        linkStrength: 0.8,
        chargeStrength: -300,
      });
    });

    it('setForceParamsで複数パラメータを同時に更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.setForceParams({
          linkDistance: 300,
          chargeStrength: -500,
        });
      });

      expect(result.current.forceParams).toEqual({
        linkDistance: 300,
        linkStrength: 0.5,
        chargeStrength: -500,
      });
    });

    it('resetForceParamsでデフォルト値にリセットできる', () => {
      const { result } = renderHook(() => useGraphStore());

      // まずパラメータを変更
      act(() => {
        result.current.setForceParams({
          linkDistance: 400,
          linkStrength: 0.9,
          chargeStrength: -800,
        });
      });

      expect(result.current.forceParams).toEqual({
        linkDistance: 400,
        linkStrength: 0.9,
        chargeStrength: -800,
      });

      // リセット
      act(() => {
        result.current.resetForceParams();
      });

      expect(result.current.forceParams).toEqual({
        linkDistance: 150,
        linkStrength: 0.5,
        chargeStrength: -300,
      });
    });
  });

  describe('マイグレーション（v3→v4）', () => {
    it.skip('v3データにforceParamsを補完する', () => {
      // Note: Zustandのpersistミドルウェアはストアの初回初期化時にのみマイグレーションを実行するため、
      // テスト環境では正確なマイグレーションのテストが困難です。
      // 実際のマイグレーションは手動で確認することを推奨します。

      // v3形式のデータをLocalStorageに設定
      const v3Data = {
        state: {
          persons: [
            { id: 'p1', name: '山田太郎', createdAt: '2026-01-01T00:00:00.000Z' },
          ],
          relationships: [],
          selectedPersonIds: [],
          forceEnabled: true,
          // forceParamsがない
        },
        version: 3,
      };
      localStorage.setItem('relationship-chart-storage', JSON.stringify(v3Data));

      // ストアを読み込む
      const { result } = renderHook(() => useGraphStore());

      // マイグレーション後のデータを確認
      expect(result.current.forceParams).toEqual({
        linkDistance: 150,
        linkStrength: 0.5,
        chargeStrength: -300,
      });
    });
  });

  describe('sidePanelOpen', () => {
    it('初期状態でsidePanelOpenがtrueである', () => {
      const { result } = renderHook(() => useGraphStore());

      expect(result.current.sidePanelOpen).toBe(true);
    });

    it('setSidePanelOpenでfalseに変更できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.setSidePanelOpen(false);
      });

      expect(result.current.sidePanelOpen).toBe(false);
    });

    it('setSidePanelOpenでtrueに変更できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // まずfalseにする
      act(() => {
        result.current.setSidePanelOpen(false);
      });

      expect(result.current.sidePanelOpen).toBe(false);

      // trueに戻す
      act(() => {
        result.current.setSidePanelOpen(true);
      });

      expect(result.current.sidePanelOpen).toBe(true);
    });

    it('toggleSidePanelで値が反転する', () => {
      const { result } = renderHook(() => useGraphStore());

      // 初期値はtrue
      expect(result.current.sidePanelOpen).toBe(true);

      // トグルでfalseになる
      act(() => {
        result.current.toggleSidePanel();
      });

      expect(result.current.sidePanelOpen).toBe(false);

      // もう一度トグルでtrueに戻る
      act(() => {
        result.current.toggleSidePanel();
      });

      expect(result.current.sidePanelOpen).toBe(true);
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '友人',
              label: '友人',
              symmetric: true,
            })
          );
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '友人',
              label: '友人',
              symmetric: true,
            })
          );
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
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
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

  describe('edgeFilter', () => {
    it('初期状態のedgeFilterはタグなし・述語なしのフィルタ（全表示）になっている', () => {
      const { result } = renderHook(() => useGraphStore());

      expect(result.current.edgeFilter.tags.mode).toBe('any');
      expect(result.current.edgeFilter.tags.values.length).toBe(0);
      expect(result.current.edgeFilter.predicates).toEqual([]);
    });

    it('updateEdgeFilter: タグフィルタを設定できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.updateEdgeFilter({
          tags: { mode: 'any', values: ['上司', '部下'] },
        });
      });

      expect(result.current.edgeFilter.tags.values).toEqual(['上司', '部下']);
      expect(result.current.edgeFilter.predicates).toEqual([]);
    });

    it('updateEdgeFilter: 述語フィルタを設定できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.updateEdgeFilter({
          predicates: [{ type: 'closeness_gte', value: 0.5 }],
        });
      });

      expect(result.current.edgeFilter.predicates).toEqual([{ type: 'closeness_gte', value: 0.5 }]);
      expect(result.current.edgeFilter.tags.values.length).toBe(0);
    });

    it('updateEdgeFilter: パッチ更新は既存のフィールドを保持する', () => {
      const { result } = renderHook(() => useGraphStore());

      // 事前に predicates を非空の値にセットする
      act(() => {
        result.current.updateEdgeFilter({
          predicates: [{ type: 'closeness_gte', value: 0.5 }],
        });
      });

      expect(result.current.edgeFilter.predicates).toEqual([{ type: 'closeness_gte', value: 0.5 }]);

      // tags のみ更新し、predicates が変わっていないことを確認する
      act(() => {
        result.current.updateEdgeFilter({
          tags: { mode: 'all', values: ['上司'] },
        });
      });

      // タグフィールドが更新されている
      expect(result.current.edgeFilter.tags.mode).toBe('all');
      expect(result.current.edgeFilter.tags.values).toEqual(['上司']);
      // predicates はパッチ更新によって変更されていない
      expect(result.current.edgeFilter.predicates).toEqual([{ type: 'closeness_gte', value: 0.5 }]);
    });

    it('updateEdgeFilter: タグのモードを any から all に変更できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.updateEdgeFilter({
          tags: { mode: 'all', values: ['友人'] },
        });
      });

      expect(result.current.edgeFilter.tags.mode).toBe('all');
    });
  });

  describe('resetAll', () => {
    it('データが存在する状態からリセットすると全状態が初期値に戻る', () => {
      const { result } = renderHook(() => useGraphStore());

      // 人物を追加
      act(() => {
        result.current.addPerson({
          name: '山田太郎',
          imageDataUrl: 'data:image/jpeg;base64,abc',
          labels: ['人物'],
          properties: {},
        });
        result.current.addPerson({
          name: '佐藤花子',
          imageDataUrl: 'data:image/jpeg;base64,def',
          labels: ['人物'],
          properties: {},
        });
      });

      const personId1 = result.current.persons[0].id;
      const personId2 = result.current.persons[1].id;

      // 関係を追加
      act(() => {
        result.current.addRelationship(
            makeRel({
              sourceId: personId1,
              targetId: personId2,
              type: '友人',
              label: '友人',
              symmetric: true,
            })
          );
      });

      // UI状態を変更
      act(() => {
        result.current.setSelectedPersonIds([personId1]);
        result.current.setForceEnabled(false);
        result.current.setForceParams({ linkDistance: 300 });
        result.current.setSidePanelOpen(false);
      });

      // リセット前の状態を確認
      expect(result.current.persons).toHaveLength(2);
      expect(result.current.relationships).toHaveLength(1);
      expect(result.current.selectedPersonIds).toEqual([personId1]);
      expect(result.current.forceEnabled).toBe(false);
      expect(result.current.forceParams.linkDistance).toBe(300);
      expect(result.current.sidePanelOpen).toBe(false);

      // リセット実行
      act(() => {
        result.current.resetAll();
      });

      // 全状態が初期値に戻ることを確認
      expect(result.current.persons).toEqual([]);
      expect(result.current.relationships).toEqual([]);
      expect(result.current.selectedPersonIds).toEqual([]);
      expect(result.current.forceEnabled).toBe(false);
      expect(result.current.forceParams).toEqual({
        linkDistance: 150,
        linkStrength: 0.5,
        chargeStrength: -300,
      });
      expect(result.current.sidePanelOpen).toBe(true);

      // Undo/Redo履歴もクリアされることを確認
      // リセット後にundoしても何も起こらない
      act(() => {
        useGraphStore.temporal.getState().undo();
      });

      expect(result.current.persons).toEqual([]);
      expect(result.current.relationships).toEqual([]);
    });

    it('空の状態でリセットしてもエラーにならない', () => {
      const { result } = renderHook(() => useGraphStore());

      // 初期状態（空）を確認
      expect(result.current.persons).toEqual([]);
      expect(result.current.relationships).toEqual([]);

      // リセット実行（エラーが発生しないことを確認）
      expect(() => {
        act(() => {
          result.current.resetAll();
        });
      }).not.toThrow();

      // 初期状態のまま
      expect(result.current.persons).toEqual([]);
      expect(result.current.relationships).toEqual([]);
      expect(result.current.selectedPersonIds).toEqual([]);
      expect(result.current.forceEnabled).toBe(false);
      expect(result.current.sidePanelOpen).toBe(true);
    });
  });

  describe('EGO Layoutパラメータ', () => {
    it('egoLayoutParamsの初期値がデフォルト値である', () => {
      const { result } = renderHook(() => useGraphStore());

      expect(result.current.egoLayoutParams).toEqual({
        ringSpacing: 200,
        firstRingRadius: 200,
      });
    });

    it('setEgoLayoutParamsでパラメータを部分更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      // ringSpacingのみ更新
      act(() => {
        result.current.setEgoLayoutParams({
          ringSpacing: 300,
        });
      });

      expect(result.current.egoLayoutParams).toEqual({
        ringSpacing: 300,
        firstRingRadius: 200, // 変更されていない
      });

      // firstRingRadiusを更新
      act(() => {
        result.current.setEgoLayoutParams({
          firstRingRadius: 150,
        });
      });

      expect(result.current.egoLayoutParams).toEqual({
        ringSpacing: 300, // 前の変更が維持されている
        firstRingRadius: 150,
      });
    });

    it('setEgoLayoutParamsで複数のパラメータを同時に更新できる', () => {
      const { result } = renderHook(() => useGraphStore());

      act(() => {
        result.current.setEgoLayoutParams({
          ringSpacing: 250,
          firstRingRadius: 180,
        });
      });

      expect(result.current.egoLayoutParams).toEqual({
        ringSpacing: 250,
        firstRingRadius: 180,
      });
    });

    it('resetEgoLayoutParamsでデフォルト値にリセットできる', () => {
      const { result } = renderHook(() => useGraphStore());

      // まずパラメータを変更
      act(() => {
        result.current.setEgoLayoutParams({
          ringSpacing: 350,
          firstRingRadius: 120,
        });
      });

      expect(result.current.egoLayoutParams).toEqual({
        ringSpacing: 350,
        firstRingRadius: 120,
      });

      // リセット
      act(() => {
        result.current.resetEgoLayoutParams();
      });

      expect(result.current.egoLayoutParams).toEqual({
        ringSpacing: 200,
        firstRingRadius: 200,
      });
    });
  });

  // チャート管理機能のテスト（Phase 2）
  describe('チャート管理', () => {
    beforeEach(async () => {
      await initDB();
    });

    afterEach(async () => {
      closeDB();
      // IndexedDBをクリアする
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map((db) => {
          if (db.name && typeof db.name === 'string') {
            return new Promise<void>((resolve, reject) => {
              const request = indexedDB.deleteDatabase(db.name as string);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            });
          }
          return Promise.resolve();
        })
      );
    });

    describe('初期状態', () => {
      it('activeChartIdはnullである', () => {
        const { result } = renderHook(() => useGraphStore());
        expect(result.current.activeChartId).toBeNull();
      });

      it('chartMetasは空配列である', () => {
        const { result } = renderHook(() => useGraphStore());
        expect(result.current.chartMetas).toEqual([]);
      });

      it('isInitializedはfalseである', () => {
        const { result } = renderHook(() => useGraphStore());
        expect(result.current.isInitialized).toBe(false);
      });

      it('isLoadingはfalseである', () => {
        const { result } = renderHook(() => useGraphStore());
        expect(result.current.isLoading).toBe(false);
      });
    });

    describe('initializeApp', () => {
      it('アプリを初期化できる', async () => {
        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        expect(result.current.isInitialized).toBe(true);
      });

      it('IndexedDB空 + LocalStorage空の場合、デフォルトチャートが作成される', async () => {
        // LocalStorageをクリア
        localStorage.clear();

        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        // デフォルトチャート「相関図 1」が作成されている
        expect(result.current.chartMetas).toHaveLength(1);
        expect(result.current.chartMetas[0].name).toBe('相関図 1');
        expect(result.current.activeChartId).toBe(result.current.chartMetas[0].id);
      });

      it('IndexedDB空 + LocalStorageありの場合、マイグレーションされてIndexedDBに保存、LocalStorage削除', async () => {
        // LocalStorageに旧データを保存
        localStorage.setItem(
          'relationship-chart-storage',
          JSON.stringify({
            state: {
              persons: [{ id: '1', name: '山田太郎', createdAt: '2024-01-01T00:00:00Z' }],
              relationships: [],
              forceEnabled: false,
              selectedPersonIds: [],
              forceParams: {
                linkDistance: 150,
                linkStrength: 0.5,
                chargeStrength: -300,
              },
              egoLayoutParams: {
                ringSpacing: 200,
                firstRingRadius: 200,
              },
              sidePanelOpen: true,
            },
            version: 1,
          })
        );

        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        // マイグレーションされたチャートが作成されている
        expect(result.current.chartMetas).toHaveLength(1);
        expect(result.current.persons).toHaveLength(1);
        expect(result.current.persons[0].name).toBe('山田太郎');

        // LocalStorageが削除されている
        expect(localStorage.getItem('relationship-chart-storage')).toBeNull();
      });

      it('IndexedDBにチャートがある場合、最新のチャートがロードされる', async () => {
        // 事前にIndexedDBにチャートを保存
        const { saveChart } = await import('@/lib/chart-db');
        await saveChart({
          id: 'chart-1',
          name: 'テストチャート',
          persons: [{ id: '1', name: '田中太郎', labels: ['人物'], properties: {}, createdAt: '2024-01-01T00:00:00Z' }],
          relationships: [],
          forceEnabled: false,
          forceParams: {
            linkDistance: 150,
            linkStrength: 0.5,
            chargeStrength: -300,
          },
          egoLayoutParams: {
            ringSpacing: 200,
            firstRingRadius: 200,
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        });

        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        // チャートがロードされている
        expect(result.current.activeChartId).toBe('chart-1');
        expect(result.current.persons).toHaveLength(1);
        expect(result.current.persons[0].name).toBe('田中太郎');
      });

      it('lastActiveChartIdが設定済みの場合、そのチャートがロードされる', async () => {
        // 2つのチャートを保存
        const { saveChart, setLastActiveChartId } = await import('@/lib/chart-db');
        await saveChart({
          id: 'chart-1',
          name: 'チャート1',
          persons: [],
          relationships: [],
          forceEnabled: false,
          forceParams: {
            linkDistance: 150,
            linkStrength: 0.5,
            chargeStrength: -300,
          },
          egoLayoutParams: {
            ringSpacing: 200,
            firstRingRadius: 200,
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        });

        await saveChart({
          id: 'chart-2',
          name: 'チャート2',
          persons: [{ id: '1', name: '鈴木次郎', labels: ['人物'], properties: {}, createdAt: '2024-01-02T00:00:00Z' }],
          relationships: [],
          forceEnabled: false,
          forceParams: {
            linkDistance: 150,
            linkStrength: 0.5,
            chargeStrength: -300,
          },
          egoLayoutParams: {
            ringSpacing: 200,
            firstRingRadius: 200,
          },
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        });

        // lastActiveChartIdを設定
        await setLastActiveChartId('chart-1');

        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        // chart-1がロードされている（updatedAtは新しいがlastActiveChartIdを優先）
        expect(result.current.activeChartId).toBe('chart-1');
      });
    });

    describe('createChart', () => {
      it('新しい相関図を作成できる', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化（デフォルトチャートが作成される）
        await act(async () => {
          await result.current.initializeApp();
        });

        // 新しいチャートを作成
        await act(async () => {
          await result.current.createChart('新しい相関図');
        });

        // 2つのチャートが存在する（デフォルト + 新規）
        expect(result.current.chartMetas).toHaveLength(2);
        expect(result.current.chartMetas[0].name).toBe('新しい相関図');
        expect(result.current.activeChartId).toBe(result.current.chartMetas[0].id);
      });

      it('50文字を超える名前でエラーをスローする', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 51文字の名前で作成を試みる
        const longName = 'あ'.repeat(51);

        await expect(
          act(async () => {
            await result.current.createChart(longName);
          })
        ).rejects.toThrow('チャート名は50文字以内で指定してください');
      });
    });

    describe('switchChart', () => {
      it('相関図を切り替えられる', async () => {
        const { result } = renderHook(() => useGraphStore());

        // 2つの相関図を作成
        await act(async () => {
          await result.current.createChart('相関図 1');
        });

        const chartId1 = result.current.activeChartId!;

        await act(async () => {
          await result.current.createChart('相関図 2');
        });

        const _chartId2 = result.current.activeChartId!;

        // 相関図1に切り替え
        await act(async () => {
          await result.current.switchChart(chartId1);
        });

        expect(result.current.activeChartId).toBe(chartId1);
      });
    });

    describe('deleteChart', () => {
      it('相関図を削除できる', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 相関図を作成
        await act(async () => {
          await result.current.createChart('削除される相関図');
        });

        const chartId = result.current.activeChartId!;

        // 別の相関図を作成
        await act(async () => {
          await result.current.createChart('残る相関図');
        });

        // 最初の相関図を削除
        await act(async () => {
          await result.current.deleteChart(chartId);
        });

        // 2つのチャートが残る（デフォルト + '残る相関図'）
        expect(result.current.chartMetas).toHaveLength(2);
        expect(result.current.chartMetas[0].name).toBe('残る相関図');
      });

      it('最後の1つは削除できない（空チャートに置換）', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化（デフォルトチャートが作成される）
        await act(async () => {
          await result.current.initializeApp();
        });

        const chartId = result.current.activeChartId!;

        // チャート名を変更
        await act(async () => {
          await result.current.renameChart(chartId, 'カスタム名前');
        });

        expect(result.current.chartMetas[0].name).toBe('カスタム名前');

        // 人物を追加
        act(() => {
          result.current.addPerson({ name: '田中太郎', labels: ['人物'], properties: {} });
        });

        expect(result.current.persons).toHaveLength(1);

        // 削除を試みる
        await act(async () => {
          await result.current.deleteChart(chartId);
        });

        // チャートは1つ存在する
        expect(result.current.chartMetas).toHaveLength(1);
        // データはリセットされている
        expect(result.current.persons).toHaveLength(0);
        // チャート名は「相関図 1」にリセットされている
        expect(result.current.chartMetas[0].name).toBe('相関図 1');
        // 人物数と関係数もリセットされている
        expect(result.current.chartMetas[0].personCount).toBe(0);
        expect(result.current.chartMetas[0].relationshipCount).toBe(0);
      });
    });

    describe('renameChart', () => {
      it('相関図の名前を変更できる', async () => {
        const { result } = renderHook(() => useGraphStore());

        // 相関図を作成
        await act(async () => {
          await result.current.createChart('元の名前');
        });

        const chartId = result.current.activeChartId!;

        // 名前を変更
        await act(async () => {
          await result.current.renameChart(chartId, '新しい名前');
        });

        expect(result.current.chartMetas[0].name).toBe('新しい名前');
      });
    });

    describe('resetAll', () => {
      it('アクティブチャートのみリセットする', () => {
        const { result } = renderHook(() => useGraphStore());

        // 人物を追加
        act(() => {
          result.current.addPerson({ name: '田中太郎', labels: ['人物'], properties: {} });
        });

        expect(result.current.persons).toHaveLength(1);

        // リセット
        act(() => {
          result.current.resetAll();
        });

        // データがクリアされる
        expect(result.current.persons).toHaveLength(0);
        expect(result.current.relationships).toHaveLength(0);
      });
    });

    describe('resetAllData', () => {
      it('すべてのチャートを削除してデフォルトチャートを作成する', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 複数のチャートを作成
        await act(async () => {
          await result.current.createChart('チャート2');
        });

        await act(async () => {
          await result.current.createChart('チャート3');
        });

        // 人物を追加
        act(() => {
          result.current.addPerson({ name: '田中太郎', labels: ['人物'], properties: {} });
        });

        expect(result.current.chartMetas).toHaveLength(3);
        expect(result.current.persons).toHaveLength(1);

        // すべてのデータをリセット
        await act(async () => {
          await result.current.resetAllData();
        });

        // デフォルトチャートのみ存在する
        expect(result.current.chartMetas).toHaveLength(1);
        expect(result.current.chartMetas[0].name).toBe('相関図 1');
        // データもリセットされている
        expect(result.current.persons).toHaveLength(0);
        expect(result.current.relationships).toHaveLength(0);
        expect(result.current.forceEnabled).toBe(false);
        expect(result.current.sidePanelOpen).toBe(true);
      });

      it('空の状態でリセットしてもエラーにならない', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化（デフォルトチャートが作成される）
        await act(async () => {
          await result.current.initializeApp();
        });

        expect(result.current.chartMetas).toHaveLength(1);

        // リセット実行（エラーが発生しないことを確認）
        await act(async () => {
          await result.current.resetAllData();
        });

        // デフォルトチャートが作成されている
        expect(result.current.chartMetas).toHaveLength(1);
        expect(result.current.chartMetas[0].name).toBe('相関図 1');
        expect(result.current.persons).toHaveLength(0);
      });

      it('リセット時にchartOrderもクリアされる', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 複数のチャートを作成
        await act(async () => {
          await result.current.createChart('相関図 A');
        });
        await act(async () => {
          await result.current.createChart('相関図 B');
        });

        expect(result.current.chartMetas).toHaveLength(3);

        // リセット実行
        await act(async () => {
          await result.current.resetAllData();
        });

        // chartOrderも含めてリセットされている（getChartOrderを直接確認）
        const { getChartOrder } = await import('@/lib/chart-db');
        const chartOrder = await getChartOrder();
        expect(chartOrder).toHaveLength(1);
        expect(result.current.chartMetas).toHaveLength(1);
      });
    });

    describe('reorderCharts', () => {
      it('相関図の並び順を変更できる', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 複数のチャートを作成
        await act(async () => {
          await result.current.createChart('相関図 A');
        });
        const chartIdA = result.current.activeChartId!;

        await act(async () => {
          await result.current.createChart('相関図 B');
        });
        const chartIdB = result.current.activeChartId!;

        await act(async () => {
          await result.current.createChart('相関図 C');
        });
        const chartIdC = result.current.activeChartId!;

        const defaultChartId = result.current.chartMetas.find((m) => m.name === '相関図 1')!.id;

        // 初期順序: C, B, A, デフォルト（作成順の逆）
        expect(result.current.chartMetas[0].id).toBe(chartIdC);
        expect(result.current.chartMetas[1].id).toBe(chartIdB);
        expect(result.current.chartMetas[2].id).toBe(chartIdA);
        expect(result.current.chartMetas[3].id).toBe(defaultChartId);

        // 並び順を変更: A, デフォルト, C, B
        const newOrder = [chartIdA, defaultChartId, chartIdC, chartIdB];
        await act(async () => {
          await result.current.reorderCharts(newOrder);
        });

        // 並び順が変更されている
        expect(result.current.chartMetas[0].id).toBe(chartIdA);
        expect(result.current.chartMetas[1].id).toBe(defaultChartId);
        expect(result.current.chartMetas[2].id).toBe(chartIdC);
        expect(result.current.chartMetas[3].id).toBe(chartIdB);

        // IndexedDBにも保存されている
        const { getChartOrder } = await import('@/lib/chart-db');
        const savedOrder = await getChartOrder();
        expect(savedOrder).toEqual(newOrder);
      });

      it('存在しないIDを含む配列でエラーをスローする', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 存在しないIDを含む配列で並び替えを試みる
        await expect(
          act(async () => {
            await result.current.reorderCharts(['non-existent-id']);
          })
        ).rejects.toThrow('並び順に存在しないチャートIDが含まれています');
      });

      it('数が一致しない配列でエラーをスローする', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        const chartId = result.current.chartMetas[0].id;

        // 数が一致しない配列で並び替えを試みる
        await expect(
          act(async () => {
            await result.current.reorderCharts([chartId, 'extra-id']);
          })
        ).rejects.toThrow('並び順のチャート数が一致しません');
      });
    });

    describe('chartOrder統合', () => {
      it('initializeApp時にchartOrderが適用される', async () => {
        // 事前にIndexedDBにチャートとchartOrderを保存
        const { saveChart, setChartOrder } = await import('@/lib/chart-db');

        await saveChart({
          id: 'chart-1',
          name: '相関図 1',
          persons: [],
          relationships: [],
          forceEnabled: false,
          forceParams: {
            linkDistance: 150,
            linkStrength: 0.5,
            chargeStrength: -300,
          },
          egoLayoutParams: {
            ringSpacing: 200,
            firstRingRadius: 200,
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        });

        await saveChart({
          id: 'chart-2',
          name: '相関図 2',
          persons: [],
          relationships: [],
          forceEnabled: false,
          forceParams: {
            linkDistance: 150,
            linkStrength: 0.5,
            chargeStrength: -300,
          },
          egoLayoutParams: {
            ringSpacing: 200,
            firstRingRadius: 200,
          },
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        });

        await saveChart({
          id: 'chart-3',
          name: '相関図 3',
          persons: [],
          relationships: [],
          forceEnabled: false,
          forceParams: {
            linkDistance: 150,
            linkStrength: 0.5,
            chargeStrength: -300,
          },
          egoLayoutParams: {
            ringSpacing: 200,
            firstRingRadius: 200,
          },
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
        });

        // 並び順を保存: chart-2, chart-1, chart-3
        await setChartOrder(['chart-2', 'chart-1', 'chart-3']);

        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        // chartOrderの順序で並んでいる
        expect(result.current.chartMetas).toHaveLength(3);
        expect(result.current.chartMetas[0].id).toBe('chart-2');
        expect(result.current.chartMetas[1].id).toBe('chart-1');
        expect(result.current.chartMetas[2].id).toBe('chart-3');
      });

      it('createChart時にchartOrderの先頭に追加される', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        const defaultChartId = result.current.chartMetas[0].id;

        // 新しいチャートを作成
        await act(async () => {
          await result.current.createChart('新規チャート');
        });

        const newChartId = result.current.activeChartId!;

        // 新規チャートが先頭に追加されている
        expect(result.current.chartMetas[0].id).toBe(newChartId);
        expect(result.current.chartMetas[1].id).toBe(defaultChartId);

        // chartOrderも更新されている
        const { getChartOrder } = await import('@/lib/chart-db');
        const chartOrder = await getChartOrder();
        expect(chartOrder).toEqual([newChartId, defaultChartId]);
      });

      it('deleteChart時にchartOrderから除外される', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 複数のチャートを作成
        await act(async () => {
          await result.current.createChart('相関図 A');
        });
        const chartIdA = result.current.activeChartId!;

        await act(async () => {
          await result.current.createChart('相関図 B');
        });
        const chartIdB = result.current.activeChartId!;

        const defaultChartId = result.current.chartMetas.find((m) => m.name === '相関図 1')!.id;

        // チャートBを削除
        await act(async () => {
          await result.current.deleteChart(chartIdB);
        });

        // chartOrderからチャートBが除外されている
        const { getChartOrder } = await import('@/lib/chart-db');
        const chartOrder = await getChartOrder();
        expect(chartOrder).toEqual([chartIdA, defaultChartId]);
        expect(chartOrder).not.toContain(chartIdB);
      });
    });

    describe('importChart', () => {
      /** テスト用の最小有効チャートJSONを生成するヘルパー */
      function makeValidChartJson(overrides: { name?: string } = {}): string {
        return JSON.stringify({
          id: 'original-id',
          name: overrides.name ?? 'インポートテスト相関図',
          persons: [
            {
              id: 'person-1',
              name: '山田太郎',
              labels: [],
              properties: {},
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
          relationships: [
            {
              id: 'rel-1',
              sourceId: 'person-1',
              targetId: 'person-1',
              type: '友人',
              label: null,
              symmetric: false,
              tags: [],
              narrative: { summary: null, notes: null, turningPoints: [] },
              colorOverride: null,
              properties: {},
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
          snapshots: [],
          forceEnabled: false,
          forceParams: {},
          egoLayoutParams: {},
          schemaVersion: 12,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        });
      }

      it('有効なJSONをインポートすると新チャートが追加されアクティブになる', async () => {
        const { result } = renderHook(() => useGraphStore());

        // アプリを初期化
        await act(async () => {
          await result.current.initializeApp();
        });

        // 初期状態: 1チャート
        expect(result.current.chartMetas).toHaveLength(1);

        // インポート実行
        const jsonString = makeValidChartJson({ name: 'インポートテスト相関図' });
        let importResult: Awaited<ReturnType<typeof result.current.importChart>> | undefined;
        await act(async () => {
          importResult = await result.current.importChart(jsonString);
        });

        // 成功結果
        expect(importResult?.ok).toBe(true);

        // chartMetasに新チャートが先頭に追加されている
        expect(result.current.chartMetas).toHaveLength(2);
        expect(result.current.chartMetas[0].name).toBe('インポートテスト相関図');

        // 新チャートがアクティブになっている
        expect(result.current.activeChartId).toBe(result.current.chartMetas[0].id);
      });

      it('インポートしたチャートには元データのIDではなく新しいIDが振り直される', async () => {
        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        const jsonString = makeValidChartJson();
        await act(async () => {
          await result.current.importChart(jsonString);
        });

        // インポート後のアクティブチャートID は元の 'original-id' ではない
        expect(result.current.activeChartId).not.toBe('original-id');

        // インポートされた人物のIDも振り直されている
        expect(result.current.persons[0].id).not.toBe('person-1');
      });

      it('chartOrderに新チャートが先頭に追加される', async () => {
        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        const defaultChartId = result.current.chartMetas[0].id;

        const jsonString = makeValidChartJson();
        await act(async () => {
          await result.current.importChart(jsonString);
        });

        const newChartId = result.current.activeChartId!;

        // IndexedDBのchartOrderを確認
        const { getChartOrder } = await import('@/lib/chart-db');
        const chartOrder = await getChartOrder();

        // 新チャートが先頭
        expect(chartOrder?.[0]).toBe(newChartId);
        expect(chartOrder).toContain(defaultChartId);
      });

      it('不正なJSON文字列は { ok: false } を返す', async () => {
        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        let importResult: Awaited<ReturnType<typeof result.current.importChart>> | undefined;
        await act(async () => {
          importResult = await result.current.importChart('{ invalid json }');
        });

        expect(importResult?.ok).toBe(false);
        expect(importResult?.ok === false && importResult.error).toMatch(/JSON/);
      });

      it('バリデーション失敗（nameなし）は { ok: false } を返す', async () => {
        const { result } = renderHook(() => useGraphStore());

        await act(async () => {
          await result.current.initializeApp();
        });

        // name が欠落したJSON
        const invalidJson = JSON.stringify({
          id: 'x',
          persons: [],
          relationships: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        });

        let importResult: Awaited<ReturnType<typeof result.current.importChart>> | undefined;
        await act(async () => {
          importResult = await result.current.importChart(invalidJson);
        });

        expect(importResult?.ok).toBe(false);
        expect(importResult?.ok === false && importResult.error).toMatch(/name/);
      });
    });

    describe('exportChart', () => {
      it('アクティブチャートをエクスポートしてもエラーが発生しない', async () => {
        // jsdom では URL.createObjectURL が未実装のためスタブに差し替え
        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        URL.revokeObjectURL = vi.fn();

        try {
          const { result } = renderHook(() => useGraphStore());

          await act(async () => {
            await result.current.initializeApp();
          });

          const activeChartId = result.current.activeChartId!;
          expect(activeChartId).toBeTruthy();

          // アクティブチャートのエクスポートがエラーなく完了する
          await act(async () => {
            await result.current.exportChart(activeChartId);
          });

          // URL.createObjectURL が呼ばれたことを確認（ダウンロード処理が実行された）
          expect(URL.createObjectURL).toHaveBeenCalled();
        } finally {
          // スタブを元に戻す
          URL.createObjectURL = originalCreateObjectURL;
          URL.revokeObjectURL = originalRevokeObjectURL;
        }
      });
    });
  });

  // ─── タイムラインスナップショット機能 ──────────────────────────────────────────

  describe('スナップショット機能', () => {
    beforeEach(async () => {
      const store = useGraphStore.getState();
      // snapshotsの初期化（タイムライン状態もリセット）
      useGraphStore.setState({
        snapshots: [],
        timelineMode: false,
        activeSnapshotIndex: null,
        _livePersons: null,
        _liveRelationships: null,
        isPlaying: false,
        playbackSpeed: 2000,
      });
      store.persons.forEach((p) => store.removePerson(p.id));
      store.relationships.forEach((r) => store.removeRelationship(r.id));
    });

    describe('captureSnapshot', () => {
      it('現在の状態をスナップショットとして保存する', () => {
        const { result } = renderHook(() => useGraphStore());

        // 人物を追加した状態でスナップショットを保存
        act(() => {
          result.current.addPerson({
            labels: ['人物'],
            name: '織田信長',
            properties: {},
          });
        });

        act(() => {
          result.current.captureSnapshot('第1話');
        });

        expect(result.current.snapshots).toHaveLength(1);
        expect(result.current.snapshots[0].label).toBe('第1話');
        expect(result.current.snapshots[0].persons).toHaveLength(1);
        expect(result.current.snapshots[0].persons[0].name).toBe('織田信長');
        expect(result.current.snapshots[0].id).toBeTruthy();
        expect(result.current.snapshots[0].createdAt).toBeTruthy();
      });

      it('descriptionを指定してスナップショットを保存できる', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第2話', '明智光秀が登場する回');
        });

        expect(result.current.snapshots[0].description).toBe('明智光秀が登場する回');
      });

      it('スナップショットのpersonsはimageDataUrlを含まない', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.addPerson({
            labels: ['人物'],
            name: '豊臣秀吉',
            imageDataUrl: 'data:image/webp;base64,AAAA',
            properties: {},
          });
        });

        act(() => {
          result.current.captureSnapshot('第3話');
        });

        // SnapshotPersonはimageDataUrlを持たないこと
        const snapshotPerson = result.current.snapshots[0].persons[0];
        expect(snapshotPerson).not.toHaveProperty('imageDataUrl');
        expect(snapshotPerson.personId).toBeTruthy();
        expect(snapshotPerson.name).toBe('豊臣秀吉');
      });

      it('複数のスナップショットを追加できる', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
        });

        act(() => {
          result.current.captureSnapshot('第2話');
        });

        expect(result.current.snapshots).toHaveLength(2);
        expect(result.current.snapshots[0].label).toBe('第1話');
        expect(result.current.snapshots[1].label).toBe('第2話');
      });
    });

    describe('deleteSnapshot', () => {
      it('指定したIDのスナップショットを削除する', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        const snapshotId = result.current.snapshots[0].id;

        act(() => {
          result.current.deleteSnapshot(snapshotId);
        });

        expect(result.current.snapshots).toHaveLength(1);
        expect(result.current.snapshots[0].label).toBe('第2話');
      });
    });

    describe('updateSnapshot', () => {
      it('スナップショットのラベルを更新する', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
        });

        const snapshotId = result.current.snapshots[0].id;

        act(() => {
          result.current.updateSnapshot(snapshotId, { label: '序章' });
        });

        expect(result.current.snapshots[0].label).toBe('序章');
      });

      it('スナップショットの説明を更新する', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
        });

        const snapshotId = result.current.snapshots[0].id;

        act(() => {
          result.current.updateSnapshot(snapshotId, { description: '物語の始まり' });
        });

        expect(result.current.snapshots[0].description).toBe('物語の始まり');
      });
    });

    describe('reorderSnapshots', () => {
      it('スナップショットの順序を並び替える', () => {
        const { result } = renderHook(() => useGraphStore());

        // 3件のスナップショットを作成する
        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
          result.current.captureSnapshot('第3話');
        });

        const [id1, id2, id3] = result.current.snapshots.map((s) => s.id);

        // 順序を逆にする
        act(() => {
          result.current.reorderSnapshots([id3, id2, id1]);
        });

        expect(result.current.snapshots[0].label).toBe('第3話');
        expect(result.current.snapshots[1].label).toBe('第2話');
        expect(result.current.snapshots[2].label).toBe('第1話');
      });

      it('タイムラインモード中は並び替えを無視する', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        const [id1, id2] = result.current.snapshots.map((s) => s.id);

        // タイムラインモードに入る
        act(() => {
          result.current.setTimelineMode(true);
        });

        // タイムラインモード中に並び替えを試みる（無視される）
        act(() => {
          result.current.reorderSnapshots([id2, id1]);
        });

        // 順序は変わらないこと
        expect(result.current.snapshots[0].label).toBe('第1話');
        expect(result.current.snapshots[1].label).toBe('第2話');
      });

      it('存在しないIDが含まれる場合はエラーをスローする', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
        });

        expect(() => {
          result.current.reorderSnapshots(['存在しないID']);
        }).toThrow('並び順に存在しないスナップショットIDが含まれています');
      });

      it('スナップショット数と異なる長さの配列はエラーをスローする', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        const [id1] = result.current.snapshots.map((s) => s.id);

        expect(() => {
          result.current.reorderSnapshots([id1]);
        }).toThrow('並び順のスナップショット数が一致しません');
      });

      it('重複したIDが含まれる場合はエラーをスローする', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
          result.current.captureSnapshot('第3話');
        });

        const [id1, _id2] = result.current.snapshots.map((s) => s.id);

        // snapshotIds=[id1,id1,id1]は長さ一致・IDも存在するが重複しており実質1件分欠落する
        expect(() => {
          result.current.reorderSnapshots([id1, id1, id1]);
        }).toThrow('並び順に重複したスナップショットIDが含まれています');
      });
    });

    describe('setTimelineMode / goToSnapshot / goToLive', () => {
      it('タイムラインモードに入るとpauseAutoSaveがtrueになる', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        act(() => {
          result.current.setTimelineMode(true);
        });

        expect(result.current.timelineMode).toBe(true);
        expect(result.current.pauseAutoSave).toBe(true);
      });

      it('タイムラインモードを終了するとpauseAutoSaveがfalseになり、ライブ状態が復元される', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.addPerson({
            labels: ['人物'],
            name: '徳川家康',
            properties: {},
          });
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        act(() => {
          result.current.setTimelineMode(true);
        });

        act(() => {
          result.current.goToSnapshot(0);
        });

        // タイムラインモード終了
        act(() => {
          result.current.setTimelineMode(false);
        });

        expect(result.current.timelineMode).toBe(false);
        expect(result.current.pauseAutoSave).toBe(false);
        // ライブ状態の人物が復元されていること
        expect(result.current.persons[0].name).toBe('徳川家康');
      });

      it('goToSnapshotで指定インデックスのスナップショット状態が反映される', () => {
        const { result } = renderHook(() => useGraphStore());

        // 第1話: 人物1人
        act(() => {
          result.current.addPerson({
            labels: ['人物'],
            name: '上杉謙信',
            properties: {},
          });
          result.current.captureSnapshot('第1話');
        });

        // 第2話: 人物2人
        act(() => {
          result.current.addPerson({
            labels: ['人物'],
            name: '武田信玄',
            properties: {},
          });
          result.current.captureSnapshot('第2話');
        });

        act(() => {
          result.current.setTimelineMode(true);
        });

        // 第1話スナップショットに移動
        act(() => {
          result.current.goToSnapshot(0);
        });

        expect(result.current.activeSnapshotIndex).toBe(0);
        // 第1話時点では人物1人
        expect(result.current.persons).toHaveLength(1);
        expect(result.current.persons[0].name).toBe('上杉謙信');
      });

      it('goToLiveでライブ状態に戻る', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.addPerson({
            labels: ['人物'],
            name: '明智光秀',
            properties: {},
          });
          result.current.addPerson({
            labels: ['人物'],
            name: '細川藤孝',
            properties: {},
          });
          result.current.captureSnapshot('第1話');
        });

        // 第1話から人物を削除してライブ状態へ
        act(() => {
          const mitsuhideId = result.current.persons.find(
            (p) => p.name === '明智光秀'
          )!.id;
          result.current.removePerson(mitsuhideId);
          result.current.captureSnapshot('第2話');
        });

        act(() => {
          result.current.setTimelineMode(true);
          result.current.goToSnapshot(0);
        });

        // ライブ状態に戻る（明智光秀が削除された最終状態）
        act(() => {
          result.current.goToLive();
        });

        expect(result.current.activeSnapshotIndex).toBeNull();
        // ライブ状態は人物1人（明智光秀を削除済み）
        expect(result.current.persons).toHaveLength(1);
        expect(result.current.persons[0].name).toBe('細川藤孝');
      });
    });

    describe('previousSnapshotIndex', () => {
      it('初期状態では previousSnapshotIndex が null である', () => {
        const { result } = renderHook(() => useGraphStore());
        expect(result.current.previousSnapshotIndex).toBeNull();
      });

      it('goToSnapshot で activeSnapshotIndex が previousSnapshotIndex に保存される', () => {
        const { result } = renderHook(() => useGraphStore());

        // 第1話・第2話・第3話を作成
        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
          result.current.captureSnapshot('第3話');
        });

        act(() => {
          result.current.setTimelineMode(true);
        });

        // 第1話に移動（直前のactiveSnapshotIndexはnull）
        act(() => {
          result.current.goToSnapshot(0);
        });

        // 第2話に移動（直前のactiveSnapshotIndexは0）
        act(() => {
          result.current.goToSnapshot(1);
        });
        expect(result.current.previousSnapshotIndex).toBe(0);
        expect(result.current.activeSnapshotIndex).toBe(1);

        // 第3話に移動（直前のactiveSnapshotIndexは1）
        act(() => {
          result.current.goToSnapshot(2);
        });
        expect(result.current.previousSnapshotIndex).toBe(1);
        expect(result.current.activeSnapshotIndex).toBe(2);
      });

      it('goToLive で previousSnapshotIndex が null にリセットされる', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        act(() => {
          result.current.setTimelineMode(true);
          result.current.goToSnapshot(0);
          result.current.goToSnapshot(1);
        });

        // previousSnapshotIndexが設定されていること
        expect(result.current.previousSnapshotIndex).toBe(0);

        // ライブに戻るとリセットされること
        act(() => {
          result.current.goToLive();
        });
        expect(result.current.previousSnapshotIndex).toBeNull();
      });

      it('setTimelineMode(false) で previousSnapshotIndex が null にリセットされる', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        act(() => {
          result.current.setTimelineMode(true);
          result.current.goToSnapshot(0);
          result.current.goToSnapshot(1);
        });

        expect(result.current.previousSnapshotIndex).toBe(0);

        // タイムラインモード終了でリセットされること
        act(() => {
          result.current.setTimelineMode(false);
        });
        expect(result.current.previousSnapshotIndex).toBeNull();
      });

      it('同じインデックスで goToSnapshot を2回呼ぶと previousSnapshotIndex は直前のインデックスになる', () => {
        const { result } = renderHook(() => useGraphStore());

        // 2つのスナップショットを作成して第1話から第1話へ再移動するエッジケースを検証
        act(() => {
          result.current.captureSnapshot('第1話');
          result.current.captureSnapshot('第2話');
        });

        act(() => {
          result.current.setTimelineMode(true);
          result.current.goToSnapshot(1);
        });
        // activeSnapshotIndex=1, previousSnapshotIndex=null（ライブから移動）
        expect(result.current.previousSnapshotIndex).toBeNull();
        expect(result.current.activeSnapshotIndex).toBe(1);

        // 同じインデックスに再移動
        act(() => {
          result.current.goToSnapshot(1);
        });
        // previousSnapshotIndex は呼び出し前の activeSnapshotIndex（=1）になる
        expect(result.current.previousSnapshotIndex).toBe(1);
        expect(result.current.activeSnapshotIndex).toBe(1);
      });
    });

    describe('isPlaying / playbackSpeed', () => {
      it('setPlaying(true) で isPlaying が true になる', () => {
        // GIVEN: 初期状態（isPlaying=false）
        const { result } = renderHook(() => useGraphStore());
        expect(result.current.isPlaying).toBe(false);

        // WHEN
        act(() => {
          result.current.setPlaying(true);
        });

        // THEN
        expect(result.current.isPlaying).toBe(true);
      });

      it('setPlaying(false) で isPlaying が false になる', () => {
        // GIVEN: isPlaying=true の状態
        const { result } = renderHook(() => useGraphStore());
        act(() => {
          result.current.setPlaying(true);
        });

        // WHEN
        act(() => {
          result.current.setPlaying(false);
        });

        // THEN
        expect(result.current.isPlaying).toBe(false);
      });

      it('setPlaybackSpeed でplaybackSpeedが変わる', () => {
        // GIVEN: 初期状態（playbackSpeed=2000）
        const { result } = renderHook(() => useGraphStore());
        expect(result.current.playbackSpeed).toBe(2000);

        // WHEN: 高速に変更
        act(() => {
          result.current.setPlaybackSpeed(1000);
        });

        // THEN
        expect(result.current.playbackSpeed).toBe(1000);
      });

      it('setTimelineMode(false) で isPlaying が false にリセットされる', () => {
        // GIVEN: タイムラインモード + 再生中の状態
        const { result } = renderHook(() => useGraphStore());
        act(() => {
          result.current.addPerson({ name: '織田信長', labels: [], properties: {} });
        });
        act(() => {
          result.current.captureSnapshot('第1話');
        });
        act(() => {
          result.current.setTimelineMode(true);
          result.current.setPlaying(true);
        });
        expect(result.current.isPlaying).toBe(true);

        // WHEN: タイムラインモードを終了
        act(() => {
          result.current.setTimelineMode(false);
        });

        // THEN: 再生も停止される
        expect(result.current.isPlaying).toBe(false);
        expect(result.current.timelineMode).toBe(false);
      });
    });
  });

  describe('エピソード機能', () => {
    beforeEach(() => {
      // エピソード関連の状態を初期化
      useGraphStore.setState({
        episodes: [],
        episodeParticipations: [],
      });
    });

    describe('createEpisode', () => {
      it('新しいエピソードを作成できる', () => {
        const { result } = renderHook(() => useGraphStore());

        let episodeId!: string;
        act(() => {
          episodeId = result.current.createEpisode({
            title: '初めての出会い',
          });
        });

        expect(result.current.episodes).toHaveLength(1);
        expect(result.current.episodes[0].id).toBe(episodeId!);
        expect(result.current.episodes[0].title).toBe('初めての出会い');
        expect(result.current.episodes[0].relatedRelationshipIds).toEqual([]);
        expect(result.current.episodes[0].properties).toEqual({});
        expect(result.current.episodes[0].createdAt).toBeTruthy();
        expect(result.current.episodes[0].updatedAt).toBeTruthy();
      });

      it('説明・日時・関連関係IDを指定してエピソードを作成できる', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.createEpisode({
            title: '決別の朝',
            description: '二人の関係が決定的に壊れた朝の場面',
            occurredAt: '第5話',
            relatedRelationshipIds: ['rel-001'],
          });
        });

        expect(result.current.episodes[0].description).toBe('二人の関係が決定的に壊れた朝の場面');
        expect(result.current.episodes[0].occurredAt).toBe('第5話');
        expect(result.current.episodes[0].relatedRelationshipIds).toEqual(['rel-001']);
      });

      it('複数のエピソードを作成できる', () => {
        const { result } = renderHook(() => useGraphStore());

        act(() => {
          result.current.createEpisode({ title: 'エピソード1' });
          result.current.createEpisode({ title: 'エピソード2' });
        });

        expect(result.current.episodes).toHaveLength(2);
      });
    });

    describe('updateEpisode', () => {
      it('エピソードのタイトルを更新できる', () => {
        const { result } = renderHook(() => useGraphStore());

        let episodeId!: string;
        act(() => {
          episodeId = result.current.createEpisode({ title: '旧タイトル' });
        });

        act(() => {
          result.current.updateEpisode(episodeId!, { title: '再会の瞬間' });
        });

        expect(result.current.episodes[0].title).toBe('再会の瞬間');
        expect(result.current.episodes[0].updatedAt).toBeTruthy();
      });

      it('複数フィールドを同時に更新できる', () => {
        const { result } = renderHook(() => useGraphStore());

        let episodeId!: string;
        act(() => {
          episodeId = result.current.createEpisode({ title: '最初の邂逅' });
        });

        act(() => {
          result.current.updateEpisode(episodeId!, {
            description: '二人が運命的に出会った場面',
            occurredAt: '第1話 冒頭',
          });
        });

        expect(result.current.episodes[0].description).toBe('二人が運命的に出会った場面');
        expect(result.current.episodes[0].occurredAt).toBe('第1話 冒頭');
        // タイトルは変更されていないこと
        expect(result.current.episodes[0].title).toBe('最初の邂逅');
      });
    });

    describe('deleteEpisode', () => {
      it('エピソードを削除できる', () => {
        const { result } = renderHook(() => useGraphStore());

        let episodeId!: string;
        act(() => {
          episodeId = result.current.createEpisode({ title: '幻の再会' });
        });

        act(() => {
          result.current.deleteEpisode(episodeId!);
        });

        expect(result.current.episodes).toHaveLength(0);
      });

      it('エピソード削除時に紐づく参加エッジも削除される', () => {
        const { result } = renderHook(() => useGraphStore());

        // 人物とエピソードを作成
        act(() => {
          result.current.addPerson({ name: '桐島 遥', labels: ['人物'], properties: {} });
        });
        let episodeId!: string;
        act(() => {
          episodeId = result.current.createEpisode({ title: '対峙' });
        });
        const personId = result.current.persons[0].id;

        // 参加エッジを追加
        act(() => {
          result.current.addParticipation({ episodeId, personId });
        });
        expect(result.current.episodeParticipations).toHaveLength(1);

        // エピソードを削除すると参加エッジも消える
        act(() => {
          result.current.deleteEpisode(episodeId);
        });

        expect(result.current.episodes).toHaveLength(0);
        expect(result.current.episodeParticipations).toHaveLength(0);
      });
    });

    describe('reorderEpisodes', () => {
      it('エピソードをID配列の順序で並び替えられる', () => {
        const { result } = renderHook(() => useGraphStore());

        let id1!: string, id2!: string, id3!: string;
        act(() => {
          id1 = result.current.createEpisode({ title: '第1エピソード' });
          id2 = result.current.createEpisode({ title: '第2エピソード' });
          id3 = result.current.createEpisode({ title: '第3エピソード' });
        });

        // 逆順に並び替え
        act(() => {
          result.current.reorderEpisodes([id3!, id2!, id1!]);
        });

        expect(result.current.episodes[0].title).toBe('第3エピソード');
        expect(result.current.episodes[1].title).toBe('第2エピソード');
        expect(result.current.episodes[2].title).toBe('第1エピソード');
      });
    });

    describe('updateEpisodePosition', () => {
      it('エピソードのキャンバス座標を更新できる', () => {
        const { result } = renderHook(() => useGraphStore());

        let episodeId!: string;
        act(() => {
          episodeId = result.current.createEpisode({ title: '運命の分岐点' });
        });

        act(() => {
          result.current.updateEpisodePosition(episodeId!, { x: 150, y: 300 });
        });

        expect(result.current.episodes[0].position).toEqual({ x: 150, y: 300 });
      });
    });

    describe('addParticipation', () => {
      it('エピソードに人物を参加者として追加できる', () => {
        const { result } = renderHook(() => useGraphStore());

        let episodeId!: string;
        act(() => {
          result.current.addPerson({ name: '水城 葵', labels: ['人物'], properties: {} });
          episodeId = result.current.createEpisode({ title: '静寂の告白' });
        });
        const personId = result.current.persons[0].id;

        let participationId!: string;
        act(() => {
          participationId = result.current.addParticipation({ episodeId, personId });
        });

        expect(result.current.episodeParticipations).toHaveLength(1);
        expect(result.current.episodeParticipations[0].id).toBe(participationId);
        expect(result.current.episodeParticipations[0].episodeId).toBe(episodeId);
        expect(result.current.episodeParticipations[0].personId).toBe(personId);
        expect(result.current.episodeParticipations[0].createdAt).toBeTruthy();
      });
    });

    describe('removeParticipation', () => {
      it('参加エッジを削除できる', () => {
        const { result } = renderHook(() => useGraphStore());

        let episodeId!: string;
        act(() => {
          result.current.addPerson({ name: '黒瀬 律', labels: ['人物'], properties: {} });
          episodeId = result.current.createEpisode({ title: '因縁の対決' });
        });
        const personId = result.current.persons[0].id;

        let participationId!: string;
        act(() => {
          participationId = result.current.addParticipation({ episodeId, personId });
        });

        act(() => {
          result.current.removeParticipation(participationId);
        });

        expect(result.current.episodeParticipations).toHaveLength(0);
      });
    });

    describe('captureSnapshot でエピソードが取り込まれる', () => {
      it('スナップショット保存時にエピソードと参加エッジが含まれる', () => {
        const { result } = renderHook(() => useGraphStore());

        useGraphStore.setState({ snapshots: [], timelineMode: false, activeSnapshotIndex: null });

        let episodeId!: string;
        act(() => {
          result.current.addPerson({ name: '橘 咲良', labels: ['人物'], properties: {} });
          episodeId = result.current.createEpisode({
            title: '出発の朝',
            description: '長い旅の始まり',
            occurredAt: '第1話',
          });
        });
        const personId = result.current.persons[0].id;
        act(() => {
          result.current.addParticipation({ episodeId, personId });
        });

        act(() => {
          result.current.captureSnapshot('第1話スナップショット');
        });

        const snapshot = result.current.snapshots[0];
        expect(snapshot.episodes).toHaveLength(1);
        expect(snapshot.episodes![0].title).toBe('出発の朝');
        expect(snapshot.episodes![0].episodeId).toBe(episodeId);
        expect(snapshot.episodeParticipations).toHaveLength(1);
        expect(snapshot.episodeParticipations![0].episodeId).toBe(episodeId);
        expect(snapshot.episodeParticipations![0].personId).toBe(personId);
      });
    });

    describe('goToSnapshot でエピソードが復元される', () => {
      it('スナップショットに戻ると保存時のエピソードが復元される', () => {
        const { result } = renderHook(() => useGraphStore());

        useGraphStore.setState({ snapshots: [], timelineMode: false, activeSnapshotIndex: null });

        let episodeId!: string;
        act(() => {
          result.current.addPerson({ name: '霧島 蒼', labels: ['人物'], properties: {} });
          episodeId = result.current.createEpisode({ title: '雨の日の記憶' });
        });
        const personId = result.current.persons[0].id;
        act(() => {
          result.current.addParticipation({ episodeId, personId });
          result.current.captureSnapshot('第2話');
        });

        // スナップショット保存後にエピソードを削除
        act(() => {
          result.current.deleteEpisode(episodeId);
        });
        expect(result.current.episodes).toHaveLength(0);

        // タイムラインモードでスナップショットに戻る
        act(() => {
          result.current.setTimelineMode(true);
          result.current.goToSnapshot(0);
        });

        // エピソードが復元されていること
        expect(result.current.episodes).toHaveLength(1);
        expect(result.current.episodes[0].title).toBe('雨の日の記憶');
        expect(result.current.episodeParticipations).toHaveLength(1);
      });
    });
  });
});
