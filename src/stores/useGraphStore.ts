/**
 * グラフストア
 * 人物と関係のグローバル状態を管理するZustandストア
 */

import { create } from 'zustand';

/**
 * 自動再生の再生速度（ミリ秒）の許可値
 * UIの3段階（1x/1.5x/2x）に対応する。TimelineBar.tsx も参照する。
 */
export const PLAYBACK_SPEEDS = [3000, 2000, 1000] as const;

/** 自動再生の再生速度型（許可された3値のみ） */
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import type { Person, PersonNarrative } from '@/types/person';
import type { Relationship, EdgeFilter } from '@/types/relationship';
import { INITIAL_EDGE_FILTER } from '@/types/relationship';
import type { EgoLayoutParams } from '@/lib/ego-layout';
import { DEFAULT_EGO_LAYOUT_PARAMS } from '@/lib/ego-layout';
import type { ChartMeta, Chart } from '@/types/chart';
import type { Snapshot, SnapshotPerson, SnapshotRelationship, SnapshotEpisode, SnapshotEpisodeParticipation } from '@/types/snapshot';
import type { Episode, EpisodeParticipation } from '@/types/episode';
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
import { migrateGraphState, normalizeChart, CURRENT_SCHEMA_VERSION } from '@/lib/migration';
import {
  serializeChartForExport,
  sanitizeFilename,
  downloadChartJson,
  validateChartData,
  prepareChartForImport,
} from '@/lib/chart-io';

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
  /** 関係のリスト（v11 プロパティグラフ形式） */
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
  /** auto-save一時停止フラグ（破壊的操作中にtrueになる） */
  pauseAutoSave: boolean;
  /** ペア編集時に表示する特定の関係ID（エッジクリック・関係一覧クリック時に設定） */
  editingRelationshipId: string | null;
  /** エッジフィルタ（タグ・述語による絞り込み、セッション内のみ保持） */
  edgeFilter: EdgeFilter;
  /** エピソードノード一覧（チャートに永続化される） */
  episodes: Episode[];
  /** エピソード参加エッジ一覧（チャートに永続化される） */
  episodeParticipations: EpisodeParticipation[];
  /** タイムラインスナップショット一覧（チャートに永続化される） */
  snapshots: Snapshot[];
  /** タイムライン再生モード（true のとき編集操作を無効化、pauseAutoSave=true） */
  timelineMode: boolean;
  /** 再生中のスナップショットインデックス（null = ライブ状態） */
  activeSnapshotIndex: number | null;
  /** タイムラインモード中のライブPersonsデータ退避（モード終了時に復元する） */
  _livePersons: Person[] | null;
  /** タイムラインモード中のライブRelationshipsデータ退避（モード終了時に復元する） */
  _liveRelationships: Relationship[] | null;
  /** タイムラインモード中のライブEpisodesデータ退避（モード終了時に復元する） */
  _liveEpisodes: Episode[] | null;
  /** タイムラインモード中のライブEpisodeParticipationsデータ退避（モード終了時に復元する） */
  _liveEpisodeParticipations: EpisodeParticipation[] | null;
  /** アニメーション自動再生中かどうか */
  isPlaying: boolean;
  /** 自動再生の再生間隔（ミリ秒）。PLAYBACK_SPEEDS で定義された3段階のみ有効 */
  playbackSpeed: PlaybackSpeed;
  /**
   * 直前に表示していたスナップショットのインデックス
   * diffハイライト計算に使用する。null = 直前のスナップショットなし（diffハイライトなし）
   */
  previousSnapshotIndex: number | null;
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
  episodes: [],
  episodeParticipations: [],
  snapshots: [],
  timelineMode: false,
  activeSnapshotIndex: null,
  _livePersons: null,
  _liveRelationships: null,
  _liveEpisodes: null,
  _liveEpisodeParticipations: null,
  isPlaying: false,
  playbackSpeed: 2000,
  previousSnapshotIndex: null,
};


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
    // タイムラインモード中は退避したライブデータを保存（スナップショット表示状態を上書きしない）
    persons: state._livePersons ?? state.persons,
    relationships: state._liveRelationships ?? state.relationships,
    episodes: state._liveEpisodes ?? state.episodes,
    episodeParticipations: state._liveEpisodeParticipations ?? state.episodeParticipations,
    forceEnabled: state.forceEnabled,
    forceParams: state.forceParams,
    egoLayoutParams: state.egoLayoutParams,
    snapshots: state.snapshots,
    schemaVersion: CURRENT_SCHEMA_VERSION,
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
 * addPerson の入力型
 * tags / narrative / colorOverride / updatedAt は省略可能（省略時にデフォルト値を補完）。
 * 既存の { name, labels, properties } のみの呼び出しとの後方互換を保つ。
 */
export type NewPersonInput = Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'narrative' | 'colorOverride'> & {
  tags?: string[];
  narrative?: PersonNarrative;
  colorOverride?: string | null;
  updatedAt?: string;
};

/** addPerson 内で使用するデフォルトの PersonNarrative 値 */
const DEFAULT_PERSON_NARRATIVE: PersonNarrative = { summary: null, notes: null };

/**
 * グラフストアのアクション型
 */
type GraphActions = {
  /**
   * 新しい人物を追加する
   * id / createdAt / updatedAt は自動生成される。
   * tags / narrative / colorOverride は省略時にデフォルト値が補完されるため、
   * 既存の呼び出し元（{ name, labels, properties } のみ渡す箇所）はそのまま動作する。
   * @param person - 追加する人物データ
   */
  addPerson: (person: NewPersonInput) => void;

  /**
   * 指定したIDの人物を更新する
   * updatedAt は自動で現在時刻に更新される。
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
   * 新しい関係を追加する（v11 プロパティグラフ形式）
   *
   * 同一ペア間に複数のエッジを持てる（マルチグラフ）。
   * 既存エッジへのマージは行わず、常に新規エッジとして追加する。
   *
   * @param relationship - 追加する関係データ（id・createdAt・updatedAt は自動生成）
   */
  addRelationship: (relationship: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>) => void;

  /**
   * 指定したIDの関係を更新する（v11 プロパティグラフ形式）
   * @param relationshipId - 更新する関係のID
   * @param updates - 更新する内容（id・sourceId・targetId・createdAt は更新不可）
   */
  updateRelationship: (relationshipId: string, updates: Partial<Omit<Relationship, 'id' | 'createdAt' | 'sourceId' | 'targetId'>>) => void;

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

  /**
   * 指定したチャートをJSON形式でエクスポートしてダウンロードする
   * @param chartId - エクスポートする相関図ID
   */
  exportChart: (chartId: string) => Promise<void>;

  /**
   * JSON文字列から新しいチャートをインポートする
   * @param jsonString - ファイルから読み取ったJSON文字列
   * @returns インポート結果（成功時は新チャートID、失敗時はエラーメッセージ）
   */
  importChart: (jsonString: string) => Promise<{ ok: true; chartId: string } | { ok: false; error: string }>;

  /**
   * 現在のグラフ状態をスナップショットとして保存する
   * @param label - スナップショットの名前（例: "第1話", "2024年春"）
   * @param description - 任意の説明文
   */
  captureSnapshot: (label: string, description?: string) => void;

  /**
   * 指定したIDのスナップショットを削除する
   * @param snapshotId - 削除するスナップショットのID
   */
  deleteSnapshot: (snapshotId: string) => void;

  /**
   * スナップショットのラベルまたは説明を更新する
   * @param snapshotId - 更新するスナップショットのID
   * @param updates - 更新する内容（label または description）
   */
  updateSnapshot: (snapshotId: string, updates: { label?: string; description?: string }) => void;

  /**
   * スナップショットの並び順を変更する
   * - タイムラインモード中は無操作（activeSnapshotIndexがインデックスベースのため）
   * @param snapshotIds - 並び替え後のスナップショットIDの配列
   * @throws スナップショット数が一致しない場合、または存在しないIDが含まれる場合
   */
  reorderSnapshots: (snapshotIds: string[]) => void;

  /**
   * タイムライン再生モードの有効/無効を切り替える
   * - true: ライブデータを退避し、pauseAutoSave=true で編集操作を無効化
   * - false: ライブデータを復元し、pauseAutoSave=false で通常モードに戻る（isPlayingもリセット）
   * @param enabled - true でタイムラインモードに入る
   */
  setTimelineMode: (enabled: boolean) => void;

  /**
   * アニメーション自動再生状態を設定する
   * @param playing - true で再生開始、false で停止
   */
  setPlaying: (playing: boolean) => void;

  /**
   * 自動再生の再生速度を設定する
   * @param ms - 再生間隔（ミリ秒）。PLAYBACK_SPEEDS で定義された値のみ有効
   */
  setPlaybackSpeed: (ms: PlaybackSpeed) => void;

  /**
   * 指定インデックスのスナップショット状態をグラフに反映する
   * タイムラインモード中のみ有効（タイムラインモード外では何もしない）
   * @param index - スナップショットのインデックス
   */
  goToSnapshot: (index: number) => void;

  /**
   * ライブ状態（最新の編集状態）に戻る
   * 退避していたライブデータを復元する
   */
  goToLive: () => void;

  /**
   * 新しいエピソードを作成する
   * @param input - タイトル・説明・日時・関連関係IDなどの入力値
   * @returns 作成したエピソードのID
   */
  createEpisode: (input: { title: string; description?: string; occurredAt?: string; relatedRelationshipIds?: string[]; position?: { x: number; y: number } }) => string;

  /**
   * エピソードを更新する
   * @param id - 更新するエピソードのID
   * @param patch - 更新する内容
   */
  updateEpisode: (id: string, patch: Partial<Omit<Episode, 'id' | 'createdAt'>>) => void;

  /**
   * エピソードを削除する（紐づく参加エッジも連動削除）
   * @param id - 削除するエピソードのID
   */
  deleteEpisode: (id: string) => void;

  /**
   * エピソードの並び順を変更する
   * @param orderedIds - 並び替え後のエピソードIDの配列
   */
  reorderEpisodes: (orderedIds: string[]) => void;

  /**
   * エピソードのキャンバス座標を更新する
   * @param id - 更新するエピソードのID
   * @param position - 新しいキャンバス座標
   */
  updateEpisodePosition: (id: string, position: { x: number; y: number }) => void;

  /**
   * 複数エピソードの位置を一括更新する（ドラッグ終了時の効率的バッチ更新用）
   * @param positions - エピソードID → 座標 のMap
   */
  updateEpisodePositions: (positions: Map<string, { x: number; y: number }>) => void;

  /**
   * エピソードに参加者（人物）を追加する
   * @param input - エピソードIDと人物ID
   * @returns 作成した参加エッジのID
   */
  addParticipation: (input: { episodeId: string; personId: string }) => string;

  /**
   * エピソード参加エッジを削除する
   * @param participationId - 削除する参加エッジのID
   */
  removeParticipation: (participationId: string) => void;
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
          set((state) => {
            const now = new Date().toISOString();
            const newPerson: Person = {
              ...person,
              id: nanoid(),
              tags: person.tags ?? [],
              narrative: { ...DEFAULT_PERSON_NARRATIVE, ...person.narrative },
              colorOverride: person.colorOverride ?? null,
              createdAt: now,
              updatedAt: person.updatedAt ?? now,
            };
            return { persons: [...state.persons, newPerson] };
          }),

        updatePerson: (personId, updates) =>
          set((state) => ({
            persons: state.persons.map((person) =>
              person.id === personId
                ? { ...person, ...updates, updatedAt: new Date().toISOString() }
                : person
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
              (r) => r.sourceId !== personId && r.targetId !== personId
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
            // マルチグラフ: 同一ペア間でも常に新規エッジとして追加する
            const newRel: Relationship = {
              ...relationship,
              id: nanoid(),
              createdAt: now,
              updatedAt: now,
            };
            return { relationships: [...state.relationships, newRel] };
          }),

        updateRelationship: (relationshipId, updates) =>
          set((state) => ({
            relationships: state.relationships.map((relationship) => {
              if (relationship.id !== relationshipId) {
                return relationship;
              }
              // v11 形式でフィールドを部分更新（updatedAt を現在時刻に更新）
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
            episodes: chart.episodes ?? [],
            episodeParticipations: chart.episodeParticipations ?? [],
            forceEnabled: chart.forceEnabled,
            forceParams: chart.forceParams,
            egoLayoutParams: chart.egoLayoutParams,
            snapshots: chart.snapshots ?? [],
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
            snapshots: [],
            selectedPersonIds: [],
            chartMetas: updatedMetas,
            // タイムラインモードも解除（新チャート作成時はライブ状態で開始）
            timelineMode: false,
            activeSnapshotIndex: null,
            _livePersons: null,
            _liveRelationships: null,
            // 再生状態もリセット（別チャートの再生状態が残らないように）
            isPlaying: false,
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
            episodes: chart.episodes ?? [],
            episodeParticipations: chart.episodeParticipations ?? [],
            forceEnabled: chart.forceEnabled,
            forceParams: chart.forceParams,
            egoLayoutParams: chart.egoLayoutParams,
            snapshots: chart.snapshots ?? [],
            selectedPersonIds: [], // 選択状態をクリア
            // タイムラインモードも解除（チャート切り替え時はライブ状態に戻す）
            timelineMode: false,
            activeSnapshotIndex: null,
            _livePersons: null,
            _liveRelationships: null,
            _liveEpisodes: null,
            _liveEpisodeParticipations: null,
            pauseAutoSave: false,
            // 再生状態もリセット（前チャートの再生状態が残らないように）
            isPlaying: false,
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

        exportChart: async (chartId: string) => {
          let chart: Chart | null = null;

          if (chartId === get().activeChartId) {
            // アクティブチャートはメモリ内の最新状態を使用（pauseAutoSave 中でもライブデータを正しく取得するため）
            const state = get();
            const meta = state.chartMetas.find((m) => m.id === state.activeChartId);
            if (meta && state.activeChartId) {
              chart = {
                id: state.activeChartId,
                name: meta.name,
                // タイムラインモード中は退避したライブデータを使用
                persons: state._livePersons ?? state.persons,
                relationships: state._liveRelationships ?? state.relationships,
                episodes: state._liveEpisodes ?? state.episodes,
                episodeParticipations: state._liveEpisodeParticipations ?? state.episodeParticipations,
                forceEnabled: state.forceEnabled,
                forceParams: state.forceParams,
                egoLayoutParams: state.egoLayoutParams,
                snapshots: state.snapshots,
                schemaVersion: CURRENT_SCHEMA_VERSION,
                createdAt: meta.createdAt,
                updatedAt: new Date().toISOString(),
              };
            }
          }

          // アクティブチャートが取得できない場合、または非アクティブチャートはIndexedDBから取得
          if (!chart) {
            const rawChart = await getChart(chartId);
            if (!rawChart) {
              throw new Error(`Chart not found: ${chartId}`);
            }
            chart = normalizeChart(rawChart);
          }

          const json = serializeChartForExport(chart);
          const filename = sanitizeFilename(chart.name) + '.json';
          downloadChartJson(json, filename);
        },

        importChart: async (jsonString: string) => {
          // 1. JSONパース
          let parsed: unknown;
          try {
            parsed = JSON.parse(jsonString);
          } catch {
            return { ok: false, error: '不正なJSON形式です' };
          }

          // 2. バリデーション
          const validateResult = validateChartData(parsed);
          if (!validateResult.ok) {
            return { ok: false, error: validateResult.error };
          }

          try {
            // 3. ID振り直し + マイグレーション
            const prepared = prepareChartForImport(validateResult.chart);

            // 4. IndexedDBに保存
            await saveChart(prepared);

            // 5. chartMetasとchartOrderを更新（新チャートを先頭に追加）
            const newMeta = {
              id: prepared.id,
              name: prepared.name,
              personCount: prepared.persons.length,
              relationshipCount: prepared.relationships.length,
              createdAt: prepared.createdAt,
              updatedAt: prepared.updatedAt,
            };
            const currentMetas = get().chartMetas;
            const updatedMetas = [newMeta, ...currentMetas];
            set(() => ({ chartMetas: updatedMetas }));

            // chartOrderを更新（新チャートを先頭に追加）
            const currentOrder = await getChartOrder();
            const currentOrderIds = currentOrder ?? currentMetas.map((m) => m.id);
            await setChartOrder([prepared.id, ...currentOrderIds]);

            // 6. 新チャートに切り替え
            await get().switchChart(prepared.id);

            return { ok: true, chartId: prepared.id };
          } catch (error) {
            console.error('[useGraphStore.importChart] インポート処理に失敗しました:', error);
            return {
              ok: false,
              error: error instanceof Error ? error.message : 'インポート処理に失敗しました',
            };
          }
        },

        captureSnapshot: (label, description) => {
          const state = get();
          // タイムラインモード中はスナップショット保存を禁止
          if (state.timelineMode) return;

          // SnapshotPerson: imageDataUrl / updatedAt を除いた軽量表現（personIdで画像を参照）
          // 配列・オブジェクトは後続の編集で過去スナップショットが変化しないようディープクローンする
          const snapshotPersons: SnapshotPerson[] = state.persons.map((p) => ({
            personId: p.id,
            name: p.name,
            labels: [...p.labels],
            position: p.position ? { ...p.position } : undefined,
            tags: [...p.tags],
            narrative: { ...p.narrative },
            colorOverride: p.colorOverride,
            properties: { ...p.properties },
          }));

          // SnapshotRelationship: 全フィールドをコピー（数値変化のアニメーション追跡用）
          // 配列・オブジェクト・narrativeもディープクローンして不変性を保証
          const snapshotRelationships: SnapshotRelationship[] = state.relationships.map((r) => ({
            relationshipId: r.id,
            type: r.type,
            sourceId: r.sourceId,
            targetId: r.targetId,
            label: r.label,
            symmetric: r.symmetric,
            tags: [...r.tags],
            colorOverride: r.colorOverride,
            properties: { ...r.properties },
            narrative: {
              summary: r.narrative.summary,
              notes: r.narrative.notes,
            },
          }));

          // SnapshotEpisode: エピソードの軽量表現
          const snapshotEpisodes: SnapshotEpisode[] = state.episodes.map((e) => ({
            episodeId: e.id,
            title: e.title,
            ...(e.description !== undefined ? { description: e.description } : {}),
            ...(e.occurredAt !== undefined ? { occurredAt: e.occurredAt } : {}),
            relatedRelationshipIds: [...e.relatedRelationshipIds],
            position: e.position ? { ...e.position } : undefined,
            properties: { ...e.properties },
          }));

          // SnapshotEpisodeParticipation: 参加エッジの軽量表現
          const snapshotParticipations: SnapshotEpisodeParticipation[] = state.episodeParticipations.map((p) => ({
            participationId: p.id,
            episodeId: p.episodeId,
            personId: p.personId,
            ...(p.role !== undefined ? { role: p.role } : {}),
          }));

          const snapshot: Snapshot = {
            id: nanoid(),
            label,
            ...(description !== undefined ? { description } : {}),
            persons: snapshotPersons,
            relationships: snapshotRelationships,
            episodes: snapshotEpisodes,
            episodeParticipations: snapshotParticipations,
            createdAt: new Date().toISOString(),
          };

          set((s) => ({ snapshots: [...s.snapshots, snapshot] }));
        },

        deleteSnapshot: (snapshotId) => {
          set((s) => {
            const deletedIndex = s.snapshots.findIndex((snap) => snap.id === snapshotId);
            const newSnapshots = s.snapshots.filter((snap) => snap.id !== snapshotId);

            // activeSnapshotIndex を削除後の配列に合わせて調整
            let newActiveSnapshotIndex = s.activeSnapshotIndex;
            if (s.activeSnapshotIndex !== null && deletedIndex !== -1) {
              if (deletedIndex < s.activeSnapshotIndex) {
                // 削除されたスナップショットが現在地より前ならインデックスを1つ前にずらす
                newActiveSnapshotIndex = s.activeSnapshotIndex - 1;
              } else if (deletedIndex === s.activeSnapshotIndex) {
                // 削除されたスナップショットが現在地ならライブに戻す
                newActiveSnapshotIndex = null;
              }
            }

            // アクティブスナップショットを削除した場合はライブデータへ復元する
            const deletingActiveSnapshot =
              s.activeSnapshotIndex !== null && deletedIndex === s.activeSnapshotIndex;

            return {
              snapshots: newSnapshots,
              activeSnapshotIndex: newActiveSnapshotIndex,
              ...(deletingActiveSnapshot && s.timelineMode
                ? {
                    persons: s._livePersons ?? s.persons,
                    relationships: s._liveRelationships ?? s.relationships,
                  }
                : {}),
            };
          });
        },

        updateSnapshot: (snapshotId, updates) => {
          set((state) => ({
            snapshots: state.snapshots.map((s) =>
              s.id === snapshotId ? { ...s, ...updates } : s
            ),
          }));
        },

        reorderSnapshots: (snapshotIds) => {
          const { snapshots, timelineMode } = get();

          // タイムラインモード中は並び替え禁止（activeSnapshotIndexがインデックスベースのため表示がズレる）
          if (timelineMode) {
            return;
          }

          if (snapshotIds.length !== snapshots.length) {
            throw new Error('並び順のスナップショット数が一致しません');
          }

          // 重複チェック: 重複があると一部IDが欠落した並び順になるためエラーとする
          if (new Set(snapshotIds).size !== snapshotIds.length) {
            throw new Error('並び順に重複したスナップショットIDが含まれています');
          }

          const currentIds = new Set(snapshots.map((s) => s.id));
          const hasInvalidId = snapshotIds.some((id) => !currentIds.has(id));
          if (hasInvalidId) {
            throw new Error('並び順に存在しないスナップショットIDが含まれています');
          }

          // snapshotIdsの順序に従ってsnapshots配列を並び替える
          const orderMap = new Map(snapshotIds.map((id, index) => [id, index]));
          const sortedSnapshots = [...snapshots].sort((a, b) => {
            const indexA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
            const indexB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
            return indexA - indexB;
          });

          set(() => ({ snapshots: sortedSnapshots }));
        },

        setTimelineMode: (enabled) => {
          const state = get();

          // 既に同じモードなら何もしない（再入時にliveデータを上書きしないため）
          if (enabled === state.timelineMode) {
            return;
          }

          if (enabled) {
            // タイムラインモードに入る: ライブデータを退避してpauseAutoSave=true
            set(() => ({
              timelineMode: true,
              pauseAutoSave: true,
              activeSnapshotIndex: null,
              _livePersons: state.persons,
              _liveRelationships: state.relationships,
              _liveEpisodes: state.episodes,
              _liveEpisodeParticipations: state.episodeParticipations,
            }));
          } else {
            // タイムラインモードを終了: ライブデータを復元してpauseAutoSave=false
            // isPlayingもリセットして再生を確実に停止する
            // previousSnapshotIndexもリセットしてdiffハイライトをクリアする
            set((s) => ({
              timelineMode: false,
              pauseAutoSave: false,
              activeSnapshotIndex: null,
              previousSnapshotIndex: null,
              isPlaying: false,
              persons: s._livePersons ?? s.persons,
              relationships: s._liveRelationships ?? s.relationships,
              episodes: s._liveEpisodes ?? s.episodes,
              episodeParticipations: s._liveEpisodeParticipations ?? s.episodeParticipations,
              _livePersons: null,
              _liveRelationships: null,
              _liveEpisodes: null,
              _liveEpisodeParticipations: null,
            }));
          }
        },

        setPlaying: (playing) => {
          set(() => ({ isPlaying: playing }));
        },

        setPlaybackSpeed: (ms) => {
          // PLAYBACK_SPEEDS 以外の値は無視する（防御的ガード）
          if (!(PLAYBACK_SPEEDS as readonly number[]).includes(ms)) return;
          set(() => ({ playbackSpeed: ms }));
        },

        goToSnapshot: (index) => {
          const state = get();
          // タイムラインモード外では何もしない
          if (!state.timelineMode) return;

          const snapshot = state.snapshots[index];
          if (!snapshot) return;

          // スナップショット時点のPersonを復元する
          // imageDataUrlは現在のlivePersonsから personId で引く（削除済みはプレースホルダー表示）
          const livePersonMap = new Map(
            (state._livePersons ?? []).map((p) => [p.id, p])
          );
          const restoredPersons: Person[] = snapshot.persons.map((sp) => {
            const livePerson = livePersonMap.get(sp.personId);
            return {
              id: sp.personId,
              name: sp.name,
              labels: [...sp.labels],
              position: sp.position ? { ...sp.position } : undefined,
              // v15以前のスナップショットには tags/narrative/colorOverride がない場合があるためデフォルト補完
              // 参照共有を避けるために配列/オブジェクトをクローンする
              tags: [...(sp.tags ?? [])],
              narrative: {
                summary: sp.narrative?.summary ?? null,
                notes: sp.narrative?.notes ?? null,
              },
              colorOverride: sp.colorOverride ?? null,
              properties: { ...sp.properties },
              imageDataUrl: livePerson?.imageDataUrl,
              createdAt: livePerson?.createdAt ?? snapshot.createdAt,
              updatedAt: snapshot.createdAt,
            };
          });

          // スナップショット時点のRelationshipを復元する
          const restoredRelationships: Relationship[] = snapshot.relationships.map((sr) => ({
            id: sr.relationshipId,
            type: sr.type,
            sourceId: sr.sourceId,
            targetId: sr.targetId,
            label: sr.label,
            symmetric: sr.symmetric,
            tags: [...sr.tags],
            colorOverride: sr.colorOverride,
            properties: { ...sr.properties },
            // narrativeを復元する（古いスナップショットにnarrativeがない場合はデフォルト値）
            narrative: sr.narrative
              ? {
                  summary: sr.narrative.summary,
                  notes: sr.narrative.notes,
                }
              : { summary: null, notes: null },
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.createdAt,
          }));

          // スナップショット時点のEpisodeを復元する
          const restoredEpisodes: Episode[] = (snapshot.episodes ?? []).map((se) => ({
            id: se.episodeId,
            title: se.title,
            description: se.description,
            occurredAt: se.occurredAt,
            relatedRelationshipIds: [...se.relatedRelationshipIds],
            position: se.position ? { ...se.position } : undefined,
            properties: { ...se.properties },
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.createdAt,
          }));

          // スナップショット時点のEpisodeParticipationを復元する
          const restoredParticipations: EpisodeParticipation[] = (snapshot.episodeParticipations ?? []).map((sep) => ({
            id: sep.participationId,
            episodeId: sep.episodeId,
            personId: sep.personId,
            role: sep.role,
            createdAt: snapshot.createdAt,
          }));

          // 直前のスナップショットインデックスを保存してdiffハイライト計算に使用する
          const previousIndex = state.activeSnapshotIndex;
          set(() => ({
            activeSnapshotIndex: index,
            previousSnapshotIndex: previousIndex,
            persons: restoredPersons,
            relationships: restoredRelationships,
            episodes: restoredEpisodes,
            episodeParticipations: restoredParticipations,
          }));
        },

        goToLive: () => {
          const state = get();
          // タイムラインモード外では何もしない
          if (!state.timelineMode) return;

          set((s) => ({
            activeSnapshotIndex: null,
            previousSnapshotIndex: null,
            persons: s._livePersons ?? s.persons,
            relationships: s._liveRelationships ?? s.relationships,
            episodes: s._liveEpisodes ?? s.episodes,
            episodeParticipations: s._liveEpisodeParticipations ?? s.episodeParticipations,
          }));
        },

        createEpisode: (input) => {
          const id = nanoid();
          const now = new Date().toISOString();
          const episode: Episode = {
            id,
            title: input.title,
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
            relatedRelationshipIds: input.relatedRelationshipIds ?? [],
            position: input.position,
            properties: {},
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({ episodes: [...s.episodes, episode] }));
          return id;
        },

        updateEpisode: (id, patch) => {
          const now = new Date().toISOString();
          set((s) => ({
            episodes: s.episodes.map((e) =>
              e.id === id ? { ...e, ...patch, updatedAt: now } : e
            ),
          }));
        },

        deleteEpisode: (id) => {
          set((s) => ({
            episodes: s.episodes.filter((e) => e.id !== id),
            // 紐づく参加エッジも連動削除
            episodeParticipations: s.episodeParticipations.filter((p) => p.episodeId !== id),
          }));
        },

        reorderEpisodes: (orderedIds) => {
          const { episodes } = get();

          if (orderedIds.length !== episodes.length) {
            throw new Error('並び順のエピソード数が一致しません');
          }
          if (new Set(orderedIds).size !== orderedIds.length) {
            throw new Error('並び順に重複したエピソードIDが含まれています');
          }
          const currentIds = new Set(episodes.map((e) => e.id));
          if (orderedIds.some((id) => !currentIds.has(id))) {
            throw new Error('並び順に存在しないエピソードIDが含まれています');
          }

          set((s) => {
            const episodeMap = new Map(s.episodes.map((e) => [e.id, e]));
            const sortedEpisodes = orderedIds
              .map((id) => episodeMap.get(id))
              .filter((e): e is Episode => e !== undefined);
            return { episodes: sortedEpisodes };
          });
        },

        updateEpisodePosition: (id, position) => {
          const now = new Date().toISOString();
          set((s) => {
            const target = s.episodes.find((e) => e.id === id);
            // 位置が変わっていない場合は更新しない（updatedAt汚染を防ぐ）
            if (
              target &&
              target.position?.x === position.x &&
              target.position?.y === position.y
            ) {
              return {};
            }
            return {
              episodes: s.episodes.map((e) =>
                e.id === id ? { ...e, position, updatedAt: now } : e
              ),
            };
          });
        },

        updateEpisodePositions: (positions) => {
          if (positions.size === 0) return;
          const now = new Date().toISOString();
          set((s) => {
            let hasChanged = false;
            const updated = s.episodes.map((e) => {
              const newPos = positions.get(e.id);
              if (!newPos) return e;
              // 位置が変わっていない場合はスキップ（updatedAt汚染を防ぐ）
              if (e.position?.x === newPos.x && e.position?.y === newPos.y) return e;
              hasChanged = true;
              return { ...e, position: newPos, updatedAt: now };
            });
            return hasChanged ? { episodes: updated } : {};
          });
        },

        addParticipation: ({ episodeId, personId }) => {
          const id = nanoid();
          const participation: EpisodeParticipation = {
            id,
            episodeId,
            personId,
            createdAt: new Date().toISOString(),
          };
          set((s) => ({ episodeParticipations: [...s.episodeParticipations, participation] }));
          return id;
        },

        removeParticipation: (participationId) => {
          set((s) => ({
            episodeParticipations: s.episodeParticipations.filter((p) => p.id !== participationId),
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
        // タイムラインモード中はgoToSnapshotによる一時的な切り替えをUndo履歴に記録しない
        partialize: (state) => ({
          persons: state.timelineMode ? (state._livePersons ?? state.persons) : state.persons,
          relationships: state.timelineMode
            ? (state._liveRelationships ?? state.relationships)
            : state.relationships,
        }),
      }
    )
  );

