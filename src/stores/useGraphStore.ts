/**
 * グラフストア
 * 人物と関係のグローバル状態を管理するZustandストア
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  /** force-directedレイアウトが有効かどうか */
  forceEnabled: boolean;
  /** 選択中の人物のIDリスト（複数選択対応） */
  selectedPersonIds: string[];
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
   * 指定したIDの人物を更新する
   * @param personId - 更新する人物のID
   * @param updates - 更新する内容（idとcreatedAtは更新不可）
   */
  updatePerson: (personId: string, updates: Partial<Omit<Person, 'id' | 'createdAt'>>) => void;

  /**
   * 指定したIDの人物を削除する
   * @param personId - 削除する人物のID
   */
  removePerson: (personId: string) => void;

  /**
   * 人物を選択または選択解除する（単一選択モード互換用）
   * @param personId - 選択する人物のID（nullで選択解除）
   */
  selectPerson: (personId: string | null) => void;

  /**
   * 人物の選択をトグルする（複数選択対応）
   * @param personId - トグルする人物のID
   */
  togglePersonSelection: (personId: string) => void;

  /**
   * すべての選択を解除する
   */
  clearSelection: () => void;

  /**
   * 選択状態を一括設定する（React Flow選択同期用）
   * @param personIds - 選択する人物のIDリスト
   */
  setSelectedPersonIds: (personIds: string[]) => void;

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

  /**
   * force-directedレイアウトの有効/無効を設定する
   * @param enabled - 有効にする場合はtrue、無効にする場合はfalse
   */
  setForceEnabled: (enabled: boolean) => void;
};

/**
 * グラフストア型（状態 + アクション）
 */
type GraphStore = GraphState & GraphActions;

/**
 * LocalStorageに保存される古い形式の状態（v0）
 */
type GraphStateLegacy = {
  persons: Person[];
  relationships: Relationship[];
  forceEnabled: boolean;
  selectedPersonId: string | null;
};

/**
 * グラフストア
 * 人物と関係を管理するグローバルストア
 * persistミドルウェアでLocalStorageに自動保存
 */
export const useGraphStore = create<GraphStore>()(
  persist(
    (set) => ({
      // 初期状態
      persons: [],
      relationships: [],
      forceEnabled: true, // デフォルトでforce-directedレイアウトを有効
      selectedPersonIds: [], // 初期状態では何も選択されていない

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

      updatePerson: (personId, updates) =>
        set((state) => ({
          persons: state.persons.map((person) =>
            person.id === personId ? { ...person, ...updates } : person
          ),
        })),

      removePerson: (personId) =>
        set((state) => ({
          persons: state.persons.filter((p) => p.id !== personId),
        })),

      selectPerson: (personId) =>
        set(() => ({
          selectedPersonIds: personId ? [personId] : [],
        })),

      togglePersonSelection: (personId) =>
        set((state) => {
          const isSelected = state.selectedPersonIds.includes(personId);
          if (isSelected) {
            // 選択解除
            return {
              selectedPersonIds: state.selectedPersonIds.filter((id) => id !== personId),
            };
          } else {
            // 選択追加
            return {
              selectedPersonIds: [...state.selectedPersonIds, personId],
            };
          }
        }),

      clearSelection: () =>
        set(() => ({
          selectedPersonIds: [],
        })),

      setSelectedPersonIds: (personIds) =>
        set(() => ({
          selectedPersonIds: personIds,
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

      setForceEnabled: (enabled) =>
        set(() => ({
          forceEnabled: enabled,
        })),
    }),
    {
      name: 'relationship-chart-storage', // LocalStorageのキー名
      version: 1, // バージョン管理
      // v0からv1へのマイグレーション
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          const oldState = persistedState as GraphStateLegacy;
          // selectedPersonId → selectedPersonIds への変換
          return {
            ...oldState,
            selectedPersonIds: oldState.selectedPersonId ? [oldState.selectedPersonId] : [],
          };
        }
        return persistedState as GraphStore;
      },
    }
  )
);
