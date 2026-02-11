/**
 * グラフストア
 * 人物と関係のグローバル状態を管理するZustandストア
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { Person } from '@/types/person';
import type { Relationship } from '@/types/relationship';
import type { EgoLayoutParams } from '@/lib/ego-layout';
import { DEFAULT_EGO_LAYOUT_PARAMS } from '@/lib/ego-layout';
import type { ChartMeta, Chart } from '@/types/chart';
import {
  initDB,
  saveChart,
  getChart,
  getAllChartMetas,
  deleteChart as deleteChartFromDB,
  getLastActiveChartId,
  setLastActiveChartId,
} from '@/lib/chart-db';
import { migrateGraphState } from '@/lib/migration';

/**
 * force-directedレイアウトのパラメータ型
 */
export type ForceParams = {
  /** リンク距離（50〜500） */
  linkDistance: number;
  /** リンク強度（0〜1） */
  linkStrength: number;
  /** 反発力（-1000〜0） */
  chargeStrength: number;
};

/**
 * force-directedレイアウトのデフォルトパラメータ
 */
export const DEFAULT_FORCE_PARAMS: ForceParams = {
  linkDistance: 150,
  linkStrength: 0.5,
  chargeStrength: -300,
};

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
  /** force-directedレイアウトのパラメータ */
  forceParams: ForceParams;
  /** EGO Layoutのパラメータ */
  egoLayoutParams: EgoLayoutParams;
  /** サイドパネルが開いているかどうか */
  sidePanelOpen: boolean;
  /** アクティブな相関図ID */
  activeChartId: string | null;
  /** 相関図のメタデータリスト */
  chartMetas: ChartMeta[];
  /** アプリ初期化完了フラグ */
  isInitialized: boolean;
  /** チャート切り替え中フラグ */
  isLoading: boolean;
};

/**
 * グラフストアの初期状態
 */
const INITIAL_STATE: GraphState = {
  persons: [],
  relationships: [],
  forceEnabled: false,
  selectedPersonIds: [],
  forceParams: DEFAULT_FORCE_PARAMS,
  egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
  sidePanelOpen: true,
  activeChartId: null,
  chartMetas: [],
  isInitialized: false,
  isLoading: false,
};

/**
 * 現在のストア状態からChartオブジェクトを構築する
 * @param state - ストアの状態
 * @returns Chartオブジェクト（activeChartIdがnullの場合はnull）
 */
function buildChartFromState(state: GraphState): Chart | null {
  if (!state.activeChartId) {
    return null;
  }

  const meta = state.chartMetas.find((m) => m.id === state.activeChartId);
  if (!meta) {
    return null;
  }

  return {
    id: state.activeChartId,
    name: meta.name,
    persons: state.persons,
    relationships: state.relationships,
    forceEnabled: state.forceEnabled,
    forceParams: state.forceParams,
    egoLayoutParams: state.egoLayoutParams,
    createdAt: meta.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 現在のチャートをIndexedDBに保存する
 * @param get - Zustandのgetトラ
 */
async function saveCurrentChart(get: () => GraphStore): Promise<void> {
  const chart = buildChartFromState(get());
  if (chart) {
    await saveChart(chart);
  }
}

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
   * 指定したIDの関係を更新する
   * @param relationshipId - 更新する関係のID
   * @param updates - 更新する内容（idとcreatedAtは更新不可）
   */
  updateRelationship: (relationshipId: string, updates: Partial<Omit<Relationship, 'id' | 'createdAt'>>) => void;

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

  /**
   * force-directedレイアウトのパラメータを設定する（部分更新）
   * @param params - 更新するパラメータ（指定したもののみ更新）
   */
  setForceParams: (params: Partial<ForceParams>) => void;

  /**
   * force-directedレイアウトのパラメータをデフォルト値にリセットする
   */
  resetForceParams: () => void;

  /**
   * EGO Layoutのパラメータを設定する（部分更新）
   * @param params - 更新するパラメータ（指定したもののみ更新）
   */
  setEgoLayoutParams: (params: Partial<EgoLayoutParams>) => void;

  /**
   * EGO Layoutのパラメータをデフォルト値にリセットする
   */
  resetEgoLayoutParams: () => void;

  /**
   * サイドパネルの開閉状態を設定する
   * @param open - 開く場合はtrue、閉じる場合はfalse
   */
  setSidePanelOpen: (open: boolean) => void;

  /**
   * サイドパネルの開閉状態をトグルする
   */
  toggleSidePanel: () => void;

  /**
   * すべてのデータと状態を初期値にリセットする
   * Undo/Redo履歴もクリアされます
   */
  resetAll: () => void;

  /**
   * アプリケーションを初期化する
   * IndexedDBからチャート一覧を読み込み、LocalStorageからのマイグレーションを実行する
   */
  initializeApp: () => Promise<void>;

  /**
   * 新しい相関図を作成する
   * @param name - 相関図の名前
   */
  createChart: (name: string) => Promise<void>;

  /**
   * 相関図を切り替える
   * @param chartId - 切り替え先の相関図ID
   */
  switchChart: (chartId: string) => Promise<void>;

  /**
   * 相関図を削除する（最後の1つは削除不可、空チャートに置換）
   * @param chartId - 削除する相関図ID
   */
  deleteChart: (chartId: string) => Promise<void>;

  /**
   * 相関図の名前を変更する
   * @param chartId - 変更する相関図ID
   * @param newName - 新しい名前
   */
  renameChart: (chartId: string, newName: string) => Promise<void>;
};

/**
 * グラフストア型（状態 + アクション）
 */
type GraphStore = GraphState & GraphActions;

/**
 * グラフストア
 * 人物と関係を管理するグローバルストア
 * temporalミドルウェアでUndo/Redo機能を提供
 *
 * ⚠️ 注意: persistミドルウェアは削除済み
 * IndexedDB永続化と自動保存はPhase 2.4以降で実装予定
 * 現在はページリロードでデータが失われます
 */
export const useGraphStore = create<GraphStore>()(
  temporal(
    (set, get) => ({
        // 初期状態
        ...INITIAL_STATE,

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
            // 関連するRelationshipも削除
            relationships: state.relationships.filter(
              (r) => r.sourcePersonId !== personId && r.targetPersonId !== personId
            ),
            // selectedPersonIdsからも除外
            selectedPersonIds: state.selectedPersonIds.filter((id) => id !== personId),
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
          set((state) => {
            // 同じペアの関係が既に存在するかチェック（方向問わず）
            const isDuplicate = state.relationships.some(
              (r) =>
                (r.sourcePersonId === relationship.sourcePersonId &&
                  r.targetPersonId === relationship.targetPersonId) ||
                (r.sourcePersonId === relationship.targetPersonId &&
                  r.targetPersonId === relationship.sourcePersonId)
            );

            // 重複している場合は追加しない
            if (isDuplicate) {
              return state;
            }

            return {
              relationships: [
                ...state.relationships,
                {
                  ...relationship,
                  id: nanoid(),
                  createdAt: new Date().toISOString(),
                },
              ],
            };
          }),

        updateRelationship: (relationshipId, updates) =>
          set((state) => ({
            relationships: state.relationships.map((relationship) => {
              if (relationship.id !== relationshipId) {
                return relationship;
              }
              // 接続先の変更は禁止し、ラベル/タイプのみ更新可能にする
              const { sourcePersonId: _sourcePersonId, targetPersonId: _targetPersonId, ...safeUpdates } = updates;
              return {
                ...relationship,
                ...safeUpdates,
              };
            }),
          })),

        removeRelationship: (relationshipId) =>
          set((state) => ({
            relationships: state.relationships.filter((r) => r.id !== relationshipId),
          })),

        setForceEnabled: (enabled) =>
          set(() => ({
            forceEnabled: enabled,
          })),

        setForceParams: (params) =>
          set((state) => ({
            forceParams: {
              ...state.forceParams,
              ...params,
            },
          })),

        resetForceParams: () =>
          set(() => ({
            forceParams: DEFAULT_FORCE_PARAMS,
          })),

        setEgoLayoutParams: (params) =>
          set((state) => ({
            egoLayoutParams: {
              ...state.egoLayoutParams,
              ...params,
            },
          })),

        resetEgoLayoutParams: () =>
          set(() => ({
            egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
          })),

        setSidePanelOpen: (open) =>
          set(() => ({
            sidePanelOpen: open,
          })),

        toggleSidePanel: () =>
          set((state) => ({
            sidePanelOpen: !state.sidePanelOpen,
          })),

        resetAll: () => {
          // データフィールドのみリセット（チャート管理状態は保持）
          set(() => ({
            persons: [],
            relationships: [],
            forceEnabled: false,
            forceParams: DEFAULT_FORCE_PARAMS,
            egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
            selectedPersonIds: [],
            sidePanelOpen: true,
          }));

          // Undo/Redo履歴をクリア
          useGraphStore.temporal.getState().clear();

          // 即座にIndexedDBに保存（チャート管理状態が保持されているため）
          void saveCurrentChart(get);
        },

        // チャート管理アクション（Phase 2）
        initializeApp: async () => {
          // 1. IndexedDBを初期化
          await initDB();

          // 2. チャート一覧を取得
          let chartMetas = await getAllChartMetas();

          // 3. チャートが0件の場合
          if (chartMetas.length === 0) {
            const localStorageKey = 'relationship-chart-storage';
            const localStorageData = localStorage.getItem(localStorageKey);

            if (localStorageData) {
              // 3a. LocalStorageからマイグレーション
              try {
                const parsed = JSON.parse(localStorageData) as {
                  state: unknown;
                  version: number;
                };
                const migratedState = migrateGraphState(parsed.state, parsed.version) as GraphState;

                // Chartとして保存
                const chartId = nanoid();
                const now = new Date().toISOString();
                const chart: Chart = {
                  id: chartId,
                  name: '相関図 1',
                  persons: migratedState.persons,
                  relationships: migratedState.relationships,
                  forceEnabled: migratedState.forceEnabled,
                  forceParams: migratedState.forceParams,
                  egoLayoutParams: migratedState.egoLayoutParams,
                  createdAt: now,
                  updatedAt: now,
                };

                await saveChart(chart);

                // LocalStorageを削除
                localStorage.removeItem(localStorageKey);

                // chartMetasを再取得
                chartMetas = await getAllChartMetas();
              } catch (error) {
                console.error('Failed to migrate from LocalStorage:', error);
                // マイグレーション失敗時はデフォルトチャートを作成
                const chartId = nanoid();
                const now = new Date().toISOString();
                const chart: Chart = {
                  id: chartId,
                  name: '相関図 1',
                  persons: [],
                  relationships: [],
                  forceEnabled: false,
                  forceParams: DEFAULT_FORCE_PARAMS,
                  egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
                  createdAt: now,
                  updatedAt: now,
                };

                await saveChart(chart);
                chartMetas = await getAllChartMetas();
              }
            } else {
              // 3b. デフォルト空チャート「相関図 1」を作成
              const chartId = nanoid();
              const now = new Date().toISOString();
              const chart: Chart = {
                id: chartId,
                name: '相関図 1',
                persons: [],
                relationships: [],
                forceEnabled: false,
                forceParams: DEFAULT_FORCE_PARAMS,
                egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
                createdAt: now,
                updatedAt: now,
              };

              await saveChart(chart);
              chartMetas = await getAllChartMetas();
            }
          }

          // 4. lastActiveChartIdを取得
          const lastActiveChartId = await getLastActiveChartId();

          // 5. ロードするチャートを決定
          let targetChartId: string;
          if (lastActiveChartId && chartMetas.some((m) => m.id === lastActiveChartId)) {
            targetChartId = lastActiveChartId;
          } else {
            // 最新のチャート（updatedAtが最新）
            targetChartId = chartMetas[0].id;
          }

          // 6. チャートをロード
          const chart = await getChart(targetChartId);
          if (!chart) {
            throw new Error(`Chart not found: ${targetChartId}`);
          }

          // 7. ストアを更新
          set(() => ({
            activeChartId: chart.id,
            chartMetas,
            persons: chart.persons,
            relationships: chart.relationships,
            forceEnabled: chart.forceEnabled,
            forceParams: chart.forceParams,
            egoLayoutParams: chart.egoLayoutParams,
            isInitialized: true,
          }));

          // 8. lastActiveChartIdを保存
          await setLastActiveChartId(chart.id);
        },

        createChart: async (name: string) => {
          // 1. 現在のチャートをIndexedDBに保存
          await saveCurrentChart(get);

          // 2. 新しいChartオブジェクトを作成
          const chartId = nanoid();
          const now = new Date().toISOString();
          const newChart: Chart = {
            id: chartId,
            name,
            persons: [],
            relationships: [],
            forceEnabled: false,
            forceParams: DEFAULT_FORCE_PARAMS,
            egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
            createdAt: now,
            updatedAt: now,
          };

          // 3. IndexedDBに保存
          await saveChart(newChart);

          // 4. chartMetasを更新
          const newMeta: ChartMeta = {
            id: chartId,
            name,
            personCount: 0,
            relationshipCount: 0,
            createdAt: now,
            updatedAt: now,
          };

          const currentMetas = get().chartMetas;
          const updatedMetas = [newMeta, ...currentMetas];
          // updatedAtの降順にソート（最新のものが先頭）
          updatedMetas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

          // 5. ストアを更新
          set(() => ({
            activeChartId: chartId,
            persons: [],
            relationships: [],
            forceEnabled: false,
            forceParams: DEFAULT_FORCE_PARAMS,
            egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
            selectedPersonIds: [],
            chartMetas: updatedMetas,
          }));

          // 6. lastActiveChartIdを更新
          await setLastActiveChartId(chartId);

          // 7. Undo/Redo履歴をクリア
          useGraphStore.temporal.getState().clear();
        },

        switchChart: async (chartId: string) => {
          // 1. 現在のチャートをIndexedDBに保存
          await saveCurrentChart(get);

          // 2. 対象チャートをロード
          const chart = await getChart(chartId);
          if (!chart) {
            throw new Error(`Chart not found: ${chartId}`);
          }

          // 3. ストアを更新
          set(() => ({
            activeChartId: chart.id,
            persons: chart.persons,
            relationships: chart.relationships,
            forceEnabled: chart.forceEnabled,
            forceParams: chart.forceParams,
            egoLayoutParams: chart.egoLayoutParams,
            selectedPersonIds: [], // 選択状態をクリア
          }));

          // 4. lastActiveChartIdを更新
          await setLastActiveChartId(chartId);

          // 5. Undo/Redo履歴をクリア
          useGraphStore.temporal.getState().clear();
        },

        deleteChart: async (chartId: string) => {
          const currentMetas = get().chartMetas;

          // 1. 最後の1つは削除できない（空チャートに置換）
          if (currentMetas.length === 1) {
            // 現在のチャートのデータをリセット
            set(() => ({
              persons: [],
              relationships: [],
              selectedPersonIds: [],
            }));

            // IndexedDBに保存（リセット状態で）
            await saveCurrentChart(get);

            // Undo/Redo履歴をクリア
            useGraphStore.temporal.getState().clear();

            return;
          }

          // 2. IndexedDBから削除
          await deleteChartFromDB(chartId);

          // 3. chartMetasを更新
          const updatedMetas = currentMetas.filter((m) => m.id !== chartId);

          // 4. 削除したのがアクティブチャートの場合 → 次のチャートに切り替え
          if (get().activeChartId === chartId) {
            // 次のチャート（最新のもの）
            const nextChartId = updatedMetas[0].id;
            const nextChart = await getChart(nextChartId);
            if (!nextChart) {
              throw new Error(`Chart not found: ${nextChartId}`);
            }

            set(() => ({
              activeChartId: nextChart.id,
              chartMetas: updatedMetas,
              persons: nextChart.persons,
              relationships: nextChart.relationships,
              forceEnabled: nextChart.forceEnabled,
              forceParams: nextChart.forceParams,
              egoLayoutParams: nextChart.egoLayoutParams,
              selectedPersonIds: [],
            }));

            await setLastActiveChartId(nextChart.id);

            // Undo/Redo履歴をクリア
            useGraphStore.temporal.getState().clear();
          } else {
            // 5. 削除したのが非アクティブの場合 → chartMetasのみ更新
            set(() => ({
              chartMetas: updatedMetas,
            }));
          }
        },

        renameChart: async (chartId: string, newName: string) => {
          // 1. 対象チャートを取得
          const chart = await getChart(chartId);
          if (!chart) {
            throw new Error(`Chart not found: ${chartId}`);
          }

          // 2. name, updatedAtを更新
          const updatedChart: Chart = {
            ...chart,
            name: newName,
            updatedAt: new Date().toISOString(),
          };

          // 3. IndexedDBに保存
          await saveChart(updatedChart);

          // 4. chartMetasを更新
          const currentMetas = get().chartMetas;
          const updatedMetas = currentMetas.map((meta) => {
            if (meta.id === chartId) {
              return {
                ...meta,
                name: newName,
                updatedAt: updatedChart.updatedAt,
              };
            }
            return meta;
          });

          // updatedAtの降順にソート（最新のものが先頭）
          updatedMetas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

          set(() => ({
            chartMetas: updatedMetas,
          }));
        },
      }),
      {
        // UI状態（selectedPersonIds, forceEnabled, egoLayoutParams, sidePanelOpen, activeChartId, chartMetas, isInitialized, isLoading）はundo対象外
        // データ状態（persons, relationships）のみをundo履歴に保存
        partialize: (state) => ({
          persons: state.persons,
          relationships: state.relationships,
        }),
      }
    )
  );

