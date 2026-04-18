/**
 * グラフストア
 * 人物と関係のグローバル状態を管理するZustandストア
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { Person } from '@/types/person';
import type { RelationshipV9, DirectionalProps, SymmetricProps, RelationshipNarrative, EdgeFilter } from '@/types/relationship';
import { INITIAL_EDGE_FILTER } from '@/types/relationship';
import type { EgoLayoutParams } from '@/lib/ego-layout';
import { DEFAULT_EGO_LAYOUT_PARAMS } from '@/lib/ego-layout';
import type { ChartMeta, Chart } from '@/types/chart';
import {
  initDB,
  saveChart,
  getChart,
  getAllChartMetas,
  deleteChart as deleteChartFromDB,
  deleteAllCharts,
  getLastActiveChartId,
  setLastActiveChartId,
  getChartOrder,
  setChartOrder,
} from '@/lib/chart-db';
import { migrateGraphState, migrateV8ToV9, migrateV9ToV10 } from '@/lib/migration';

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
  /** 関係のリスト（v9 プロパティグラフ形式） */
  relationships: RelationshipV9[];
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
  /** auto-save一時停止フラグ（破壊的操作中にtrueになる） */
  pauseAutoSave: boolean;
  /** ペア編集時に表示する特定の関係ID（エッジクリック・関係一覧クリック時に設定） */
  editingRelationshipId: string | null;
  /** エッジフィルタ（タグ・述語による絞り込み、セッション内のみ保持） */
  edgeFilter: EdgeFilter;
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
  pauseAutoSave: false,
  editingRelationshipId: null,
  edgeFilter: INITIAL_EDGE_FILTER,
};

/**
 * 2 つの RelationshipV9 をマージする
 *
 * @description
 * 既存エッジ (base) に新しいデータ (incoming) をマージする。
 * null でないフィールドのみ上書きし、tags は union で統合、
 * narrative.notes は改行で追記する。
 *
 * @param base - 既存のエッジ
 * @param incoming - マージする新しいデータ（id/createdAt/updatedAt を除く）
 * @param now - updatedAt に設定する現在時刻（ISO 8601 文字列）
 * @returns マージ後の RelationshipV9
 */
function mergeRelationshipV9(
  base: RelationshipV9,
  incoming: Omit<RelationshipV9, 'id' | 'createdAt' | 'updatedAt'>,
  now: string
): RelationshipV9 {
  // DirectionalProps のマージ（null でないフィールドのみ上書き）
  const mergeDirectional = (b: DirectionalProps, i: DirectionalProps): DirectionalProps => ({
    label: i.label !== null ? i.label : b.label,
    affection: i.affection !== null ? i.affection : b.affection,
    awareness: i.awareness !== null ? i.awareness : b.awareness,
    role: i.role !== null ? i.role : b.role,
  });

  // SymmetricProps のマージ（null でないフィールドのみ上書き）
  const mergeSymmetric = (b: SymmetricProps, i: SymmetricProps): SymmetricProps => ({
    closeness: i.closeness !== null ? i.closeness : b.closeness,
    trust: i.trust !== null ? i.trust : b.trust,
    tension: i.tension !== null ? i.tension : b.tension,
    secrecy: i.secrecy !== null ? i.secrecy : b.secrecy,
    kinship: i.kinship !== null ? i.kinship : b.kinship,
  });

  // RelationshipNarrative のマージ（notes は改行で追記）
  const mergeNarrative = (b: RelationshipNarrative, i: RelationshipNarrative): RelationshipNarrative => {
    const mergedNotes =
      b.notes && i.notes
        ? `${b.notes}\n${i.notes}`
        : i.notes ?? b.notes;
    return {
      summary: i.summary !== null ? i.summary : b.summary,
      notes: mergedNotes,
      // at + note をキーとして重複排除する（同一ターニングポイントが重複登録されないようにする）
      turningPoints: [...b.turningPoints, ...i.turningPoints].filter(
        (tp, index, arr) =>
          arr.findIndex((t) => t.at === tp.at && t.note === tp.note) === index
      ),
    };
  };

  // tags は union（重複排除）
  const mergedTags = Array.from(new Set([...base.tags, ...incoming.tags]));

  return {
    ...base,
    isDirected: incoming.isDirected,
    symmetric: mergeSymmetric(base.symmetric, incoming.symmetric),
    forward: mergeDirectional(base.forward, incoming.forward),
    reverse: mergeDirectional(base.reverse, incoming.reverse),
    tags: mergedTags,
    narrative: mergeNarrative(base.narrative, incoming.narrative),
    colorOverride: incoming.colorOverride !== null ? incoming.colorOverride : base.colorOverride,
    updatedAt: now,
  };
}

/**
 * 現在のストア状態からChartオブジェクトを構築する
 * @param state - ストアの状態
 * @returns Chartオブジェクト（activeChartIdがnullまたはpauseAutoSaveがtrueの場合はnull）
 */
function buildChartFromState(state: GraphState): Chart | null {
  // auto-save一時停止中はnullを返す
  if (state.pauseAutoSave) {
    return null;
  }

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
    // v10 形式であることを明示する（ロード時の再マイグレーションを防ぐ）
    schemaVersion: 10,
    createdAt: meta.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * IndexedDB からロードした Chart 全体を v10 形式に正規化する。
 * relationships（v8→v9）と persons（v9→v10 labels）の両方を対象とする。
 * `schemaVersion` が未定義または 9 未満の場合に `migrateV8ToV9` を適用し、
 * 9 未満の場合は `migrateV9ToV10` も適用する。v10 以降のデータはそのまま返す。
 *
 * @param chart - IndexedDB からロードした Chart（任意のスキーマバージョン）
 * @returns v10 形式に正規化された Chart（schemaVersion: 10 付き）
 */
function normalizeChart(chart: Chart): Chart {
  // v10 以降は変換不要
  if ((chart.schemaVersion ?? 0) >= 10) {
    return chart;
  }

  let normalized = chart;

  // v8 以前のデータを v9 形式に変換する
  if ((chart.schemaVersion ?? 0) < 9) {
    const legacyRels = chart.relationships as unknown as Parameters<typeof migrateV8ToV9>[0];
    const v9Rels = migrateV8ToV9(legacyRels);
    normalized = { ...normalized, relationships: v9Rels };
  }

  // v9 以前の persons を v10 形式（labels）に変換する
  const v10Persons = migrateV9ToV10(normalized.persons);

  return {
    ...normalized,
    persons: v10Persons,
    schemaVersion: 10,
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
 * デフォルト空チャート「相関図 1」を作成してIndexedDBに保存する
 * @returns 作成されたチャート
 */
async function createDefaultChart(): Promise<Chart> {
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
  return chart;
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
   * 複数人のノード位置を一括更新する
   * @param positions - 人物IDをキーとする位置のMap
   */
  updatePersonPositions: (positions: Map<string, { x: number; y: number }>) => void;

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
   * ペア編集のために2人を選択し、特定の関係を編集対象として記録する
   * エッジクリック・関係一覧クリック時に使用する
   * @param id1 - 人物1のID
   * @param id2 - 人物2のID
   * @param relationshipId - 編集対象の関係ID
   */
  selectPersonPairForEdit: (id1: string, id2: string, relationshipId: string) => void;

  /**
   * 新しい関係を追加する（v9 プロパティグラフ形式）
   *
   * 同一ペア（sourcePersonId/targetPersonId の順不同）の関係が既に存在する場合は
   * 既存エッジにマージする（null でないフィールドを上書き、tags は union、
   * narrative.notes は追記）。存在しない場合は新規追加する。
   *
   * @param relationship - 追加する関係データ（id・createdAt・updatedAt は自動生成）
   */
  addRelationship: (relationship: Omit<RelationshipV9, 'id' | 'createdAt' | 'updatedAt'>) => void;

  /**
   * 指定したIDの関係を更新する（v9 プロパティグラフ形式）
   * @param relationshipId - 更新する関係のID
   * @param updates - 更新する内容（id・sourcePersonId・targetPersonId・createdAt は更新不可）
   */
  updateRelationship: (relationshipId: string, updates: Partial<Omit<RelationshipV9, 'id' | 'createdAt' | 'sourcePersonId' | 'targetPersonId'>>) => void;

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
   * エッジフィルタを部分更新する（セッション内のみ有効）
   * @param patch - 更新するフィールド（指定したもののみ更新）
   */
  updateEdgeFilter: (patch: Partial<EdgeFilter>) => void;

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
  createChart: (name?: string) => Promise<void>;

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

  /**
   * 相関図の並び順を変更する
   * @param chartIds - 並び順のチャートIDリスト
   */
  reorderCharts: (chartIds: string[]) => Promise<void>;

  /**
   * すべてのデータをリセットする（全チャート削除 + デフォルトチャート作成）
   */
  resetAllData: () => Promise<void>;
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
 * IndexedDBへの永続化はauto-saveモジュール（auto-save.ts）と
 * チャート管理アクション（initializeApp, createChart等）で実現
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

        updatePersonPositions: (positions) =>
          set((state) => ({
            persons: state.persons.map((person) => {
              const newPosition = positions.get(person.id);
              return newPosition ? { ...person, position: newPosition } : person;
            }),
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
            editingRelationshipId: null,
          })),

        setSelectedPersonIds: (personIds) =>
          set(() => ({
            selectedPersonIds: personIds,
            editingRelationshipId: null,
          })),

        selectPersonPairForEdit: (id1, id2, relationshipId) =>
          set(() => ({
            selectedPersonIds: [id1, id2],
            editingRelationshipId: relationshipId,
          })),

        addRelationship: (relationship) =>
          set((state) => {
            const now = new Date().toISOString();

            // 同一ペアの既存エッジを検索（source/target の順序に依存しない）
            const existingIndex = state.relationships.findIndex(
              (r) =>
                (r.sourcePersonId === relationship.sourcePersonId &&
                  r.targetPersonId === relationship.targetPersonId) ||
                (r.sourcePersonId === relationship.targetPersonId &&
                  r.targetPersonId === relationship.sourcePersonId)
            );

            if (existingIndex === -1) {
              // 新規ペア: 新しいエッジを追加
              const newRel: RelationshipV9 = {
                ...relationship,
                id: nanoid(),
                createdAt: now,
                updatedAt: now,
              };
              return { relationships: [...state.relationships, newRel] };
            }

            // 既存ペア: null でないフィールドをマージ
            const existing = state.relationships[existingIndex];
            const merged = mergeRelationshipV9(existing, relationship, now);
            const updatedRelationships = [...state.relationships];
            updatedRelationships[existingIndex] = merged;
            return { relationships: updatedRelationships };
          }),

        updateRelationship: (relationshipId, updates) =>
          set((state) => ({
            relationships: state.relationships.map((relationship) => {
              if (relationship.id !== relationshipId) {
                return relationship;
              }
              // v9 形式でフィールドを部分更新（updatedAt を現在時刻に更新）
              return {
                ...relationship,
                ...updates,
                updatedAt: new Date().toISOString(),
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

        updateEdgeFilter: (patch) =>
          set((state) => ({
            edgeFilter: {
              ...state.edgeFilter,
              ...patch,
            },
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
          void saveCurrentChart(get).catch((error) => {
            console.error('Failed to save chart after resetAll:', error);
          });
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

                // バリデーション: パース結果が期待する構造かチェック
                if (!parsed || typeof parsed.version !== 'number' || !parsed.state) {
                  throw new Error('Invalid LocalStorage data format');
                }

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
                // chartOrderを初期化
                await setChartOrder([chartId]);

                // LocalStorageを削除
                localStorage.removeItem(localStorageKey);

                // chartMetasを再取得
                chartMetas = await getAllChartMetas();
              } catch (error) {
                console.error('Failed to migrate from LocalStorage:', error);
                // マイグレーション失敗時はデフォルトチャートを作成
                const defaultChart = await createDefaultChart();
                await setChartOrder([defaultChart.id]);
                chartMetas = await getAllChartMetas();
              }
            } else {
              // 3b. デフォルト空チャート「相関図 1」を作成
              const defaultChart = await createDefaultChart();
              await setChartOrder([defaultChart.id]);
              chartMetas = await getAllChartMetas();
            }
          }

          // 4. chartOrderを取得して並び順を適用
          const chartOrder = await getChartOrder();
          if (chartOrder) {
            // chartOrderの順序でchartMetasをソート
            const orderMap = new Map(chartOrder.map((id, index) => [id, index]));
            chartMetas.sort((a, b) => {
              const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
              const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
              return indexA - indexB;
            });
          }

          // 5. lastActiveChartIdを取得
          const lastActiveChartId = await getLastActiveChartId();

          // 6. ロードするチャートを決定
          let targetChartId: string;
          if (lastActiveChartId && chartMetas.some((m) => m.id === lastActiveChartId)) {
            targetChartId = lastActiveChartId;
          } else {
            // 先頭のチャート（chartOrderまたはupdatedAtが最新）
            targetChartId = chartMetas[0].id;
          }

          // 7. チャートをロード（v8 以前のデータは v9 形式に変換して書き戻す）
          const rawChart = await getChart(targetChartId);
          if (!rawChart) {
            throw new Error(`Chart not found: ${targetChartId}`);
          }
          const chart = normalizeChart(rawChart);
          // v8→v9 変換が行われた場合は IndexedDB に書き戻す（次回ロード時の再変換を防ぐ）
          if (rawChart.schemaVersion !== chart.schemaVersion) {
            await saveChart(chart);
          }

          // 8. ストアを更新
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

          // 9. lastActiveChartIdを保存
          await setLastActiveChartId(chart.id);
        },

        createChart: async (name?: string) => {
          // 1. 現在のチャートをIndexedDBに保存
          await saveCurrentChart(get);

          // 2. nameが指定されている場合は長さをバリデーション
          if (name && name.length > 50) {
            throw new Error('チャート名は50文字以内で指定してください');
          }

          // 3. nameが指定されていない場合はデフォルト名を生成
          const currentMetas = get().chartMetas;
          const chartName =
            name ||
            (() => {
              // 既存のチャート名から「相関図 X」のパターンを探して最大値を取得
              const chartNumbers = currentMetas
                .map((meta) => {
                  const match = meta.name.match(/^相関図 (\d+)$/);
                  return match ? parseInt(match[1], 10) : 0;
                })
                .filter((num) => num > 0);

              const maxNumber = chartNumbers.length > 0 ? Math.max(...chartNumbers) : 0;
              return `相関図 ${maxNumber + 1}`;
            })();

          // 4. 新しいChartオブジェクトを作成
          const chartId = nanoid();
          const now = new Date().toISOString();
          const newChart: Chart = {
            id: chartId,
            name: chartName,
            persons: [],
            relationships: [],
            forceEnabled: false,
            forceParams: DEFAULT_FORCE_PARAMS,
            egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
            createdAt: now,
            updatedAt: now,
          };

          // 5. IndexedDBに保存
          await saveChart(newChart);

          // 6. chartMetasを更新
          const newMeta: ChartMeta = {
            id: chartId,
            name: chartName,
            personCount: 0,
            relationshipCount: 0,
            createdAt: now,
            updatedAt: now,
          };

          const updatedMetas = [newMeta, ...currentMetas];

          // 7. chartOrderを更新（先頭に追加）
          const currentOrder = await getChartOrder();
          const newOrder = [chartId, ...(currentOrder || currentMetas.map((m) => m.id))];
          await setChartOrder(newOrder);

          // 8. ストアを更新
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

          // 9. lastActiveChartIdを更新
          await setLastActiveChartId(chartId);

          // 10. Undo/Redo履歴をクリア
          useGraphStore.temporal.getState().clear();
        },

        switchChart: async (chartId: string) => {
          // 1. 現在のチャートをIndexedDBに保存
          await saveCurrentChart(get);

          // 2. 対象チャートをロード（v8 以前のデータは v9 形式に変換して書き戻す）
          const rawChart = await getChart(chartId);
          if (!rawChart) {
            throw new Error(`Chart not found: ${chartId}`);
          }
          const chart = normalizeChart(rawChart);
          // v8→v9 変換が行われた場合は IndexedDB に書き戻す（次回ロード時の再変換を防ぐ）
          if (rawChart.schemaVersion !== chart.schemaVersion) {
            await saveChart(chart);
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
            // 現在のチャートのデータをリセット（resetAllと同様の完全リセット）
            set(() => ({
              persons: [],
              relationships: [],
              forceEnabled: false,
              forceParams: DEFAULT_FORCE_PARAMS,
              egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
              selectedPersonIds: [],
              sidePanelOpen: true,
            }));

            // chartMetasを「相関図 1」に更新
            const now = new Date().toISOString();
            const updatedMetas = currentMetas.map((meta) => ({
              ...meta,
              name: '相関図 1',
              personCount: 0,
              relationshipCount: 0,
              updatedAt: now,
            }));

            set(() => ({ chartMetas: updatedMetas }));

            // IndexedDBに保存（リセット状態で）
            await saveCurrentChart(get);

            // chartOrderも更新（単一チャートのIDのみ）
            await setChartOrder([currentMetas[0].id]);

            // Undo/Redo履歴をクリア
            useGraphStore.temporal.getState().clear();

            return;
          }

          // 2. chartMetasを更新（削除後の状態を先に計算）
          const updatedMetas = currentMetas.filter((m) => m.id !== chartId);

          // 3. chartOrderから除外
          const currentOrder = await getChartOrder();
          if (currentOrder) {
            const newOrder = currentOrder.filter((id) => id !== chartId);
            await setChartOrder(newOrder);
          }

          // 4. 削除したのがアクティブチャートの場合 → 次のチャートを先にロード
          if (get().activeChartId === chartId) {
            // 次のチャート（先頭のもの）を先にロード
            const nextChartId = updatedMetas[0].id;
            const nextChart = await getChart(nextChartId);
            if (!nextChart) {
              throw new Error(`Chart not found: ${nextChartId}`);
            }

            // 5. 次のチャートのロードに成功したらIndexedDBから削除
            await deleteChartFromDB(chartId);

            // 6. ストアを更新
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
            // 7. 削除したのが非アクティブの場合 → IndexedDBから削除してchartMetasのみ更新
            await deleteChartFromDB(chartId);

            set(() => ({
              chartMetas: updatedMetas,
            }));
          }
        },

        renameChart: async (chartId: string, newName: string) => {
          let updatedChart: Chart;

          // 1. アクティブチャートの場合は、メモリ内の最新状態を使用
          if (chartId === get().activeChartId) {
            const currentChart = buildChartFromState(get());
            if (!currentChart) {
              throw new Error(`Active chart not found: ${chartId}`);
            }

            updatedChart = {
              ...currentChart,
              name: newName,
              updatedAt: new Date().toISOString(),
            };
          } else {
            // 2. 非アクティブチャートの場合は、IndexedDBから取得
            const chart = await getChart(chartId);
            if (!chart) {
              throw new Error(`Chart not found: ${chartId}`);
            }

            updatedChart = {
              ...chart,
              name: newName,
              updatedAt: new Date().toISOString(),
            };
          }

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

          // 並び順は変更しない（chartOrderを維持）
          set(() => ({
            chartMetas: updatedMetas,
          }));
        },

        reorderCharts: async (chartIds: string[]) => {
          const currentMetas = get().chartMetas;

          // 1. 数が一致するかチェック
          if (chartIds.length !== currentMetas.length) {
            throw new Error('並び順のチャート数が一致しません');
          }

          // 2. すべてのIDが存在するかチェック
          const currentIds = new Set(currentMetas.map((m) => m.id));
          const hasInvalidId = chartIds.some((id) => !currentIds.has(id));
          if (hasInvalidId) {
            throw new Error('並び順に存在しないチャートIDが含まれています');
          }

          // 3. chartOrderをIndexedDBに保存
          await setChartOrder(chartIds);

          // 4. chartMetasをソート
          const orderMap = new Map(chartIds.map((id, index) => [id, index]));
          const sortedMetas = [...currentMetas].sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return indexA - indexB;
          });

          // 5. ストアを更新
          set(() => ({
            chartMetas: sortedMetas,
          }));
        },

        resetAllData: async () => {
          // auto-saveを一時停止
          set(() => ({ pauseAutoSave: true }));

          try {
            // 1. すべてのチャートを削除
            await deleteAllCharts();

            // 2. デフォルト空チャートを作成
            const chart = await createDefaultChart();

            // 3. chartOrderをリセット
            await setChartOrder([chart.id]);

            // 4. メタデータを再取得
            const chartMetas = await getAllChartMetas();

            // 5. lastActiveChartIdを更新
            await setLastActiveChartId(chart.id);

            // 6. ストアを初期状態にリセット（すべての破壊的操作が成功した後）
            set(() => ({
              activeChartId: chart.id,
              chartMetas,
              persons: [],
              relationships: [],
              forceEnabled: false,
              forceParams: DEFAULT_FORCE_PARAMS,
              egoLayoutParams: DEFAULT_EGO_LAYOUT_PARAMS,
              selectedPersonIds: [],
              sidePanelOpen: true,
              pauseAutoSave: false,
            }));

            // 7. Undo/Redo履歴をクリア
            useGraphStore.temporal.getState().clear();
          } catch (error) {
            // エラー時はauto-save一時停止を解除
            set(() => ({ pauseAutoSave: false }));
            throw error;
          }
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

