/**
 * グラフストア
 * 人物と関係のグローバル状態を管理するZustandストア
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';

/**
 * グラフストアの状態型
 */
type GraphState = {
  /** 人物のリスト */
  persons: Person[];
  /** 関係のリスト */
  relationships: Relationship[];
};

/**
 * グラフストアのアクション型
 */
type GraphActions = {
  /**
   * 新しい人物を追加する
   * @param person - 追加する人物データ（idとcreatedAtは自動生成される）
   */
  addPerson: (person: Omit<Person, 'id' | 'createdAt'>) => void;

  /**
   * 指定したIDの人物を削除する
   * @param personId - 削除する人物のID
   */
  removePerson: (personId: string) => void;

  /**
   * 新しい関係を追加する
   * @param relationship - 追加する関係データ（idとcreatedAtは自動生成される）
   */
  addRelationship: (relationship: Omit<Relationship, 'id' | 'createdAt'>) => void;

  /**
   * 指定したIDの関係を削除する
   * @param relationshipId - 削除する関係のID
   */
  removeRelationship: (relationshipId: string) => void;
};

/**
 * グラフストア型（状態 + アクション）
 */
type GraphStore = GraphState & GraphActions;

/**
 * グラフストア
 * 人物と関係を管理するグローバルストア
 */
export const useGraphStore = create<GraphStore>((set) => ({
  // 初期状態
  persons: [],
  relationships: [],

  // アクション
  addPerson: (person) =>
    set((state) => ({
      persons: [
        ...state.persons,
        {
          ...person,
          id: nanoid(),
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  removePerson: (personId) =>
    set((state) => ({
      persons: state.persons.filter((p) => p.id !== personId),
    })),

  addRelationship: (relationship) =>
    set((state) => ({
      relationships: [
        ...state.relationships,
        {
          ...relationship,
          id: nanoid(),
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  removeRelationship: (relationshipId) =>
    set((state) => ({
      relationships: state.relationships.filter((r) => r.id !== relationshipId),
    })),
}));
