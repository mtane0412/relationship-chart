/**
 * 自動保存モジュール
 * ストアの変更を監視し、debounce後にIndexedDBに保存する
 */

import { useGraphStore } from '@/stores/useGraphStore';
import { saveChart } from './chart-db';
import type { Chart } from '@/types/chart';

/**
 * debounce時間（ミリ秒）
 */
let DEBOUNCE_TIME = 1000;

/**
 * debounce時間を設定する（テスト用）
 * @param ms - debounce時間（ミリ秒）
 */
export function _setDebounceTime(ms: number): void {
  DEBOUNCE_TIME = ms;
}

/**
 * Zustandのunsubscribe関数
 */
let unsubscribe: (() => void) | null = null;

/**
 * debounceタイマーID
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 保留中の保存があるかどうか
 */
let hasPendingSave = false;

/**
 * 現在実行中の保存Promise（テスト用）
 */
let currentSavePromise: Promise<void> | null = null;

/**
 * 現在のストア状態からChartオブジェクトを構築する
 * @returns Chartオブジェクト（activeChartIdがnullの場合はnull）
 */
function buildChartFromState(): Chart | null {
  const state = useGraphStore.getState();

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
 * 保存処理を実行する
 */
async function performSave(): Promise<void> {
  const chart = buildChartFromState();
  if (!chart) {
    currentSavePromise = null;
    return;
  }

  const savePromise = (async () => {
    await saveChart(chart);

    // chartMetasのupdatedAtを更新
    const state = useGraphStore.getState();
    const updatedMetas = state.chartMetas.map((meta) => {
      if (meta.id === chart.id) {
        return {
          ...meta,
          personCount: chart.persons.length,
          relationshipCount: chart.relationships.length,
          updatedAt: chart.updatedAt,
        };
      }
      return meta;
    });

    // 並び順は変更しない（chartOrderを維持）
    useGraphStore.setState({ chartMetas: updatedMetas });
    hasPendingSave = false;
    currentSavePromise = null;
  })();

  currentSavePromise = savePromise;
  await savePromise;
}

/**
 * 自動保存を開始する
 * ストアの変更を監視し、debounce後にIndexedDBに保存する
 */
export function startAutoSave(): void {
  // 既に監視中の場合は何もしない
  if (unsubscribe) {
    return;
  }

  // 前回の状態を保持（変更検出用）
  const initialState = useGraphStore.getState();
  let previousState = JSON.stringify({
    persons: initialState.persons,
    relationships: initialState.relationships,
    forceEnabled: initialState.forceEnabled,
    forceParams: initialState.forceParams,
    egoLayoutParams: initialState.egoLayoutParams,
  });

  // ストアの変更を監視
  unsubscribe = useGraphStore.subscribe((state) => {
    // 監視対象フィールドの現在の状態
    const currentState = JSON.stringify({
      persons: state.persons,
      relationships: state.relationships,
      forceEnabled: state.forceEnabled,
      forceParams: state.forceParams,
      egoLayoutParams: state.egoLayoutParams,
    });

    // 変更がない場合はスキップ
    if (currentState === previousState) {
      return;
    }

    previousState = currentState;

    // debounceタイマーをクリア
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // 保留中の保存フラグを設定
    hasPendingSave = true;

    // debounce後に保存
    debounceTimer = setTimeout(() => {
      void performSave();
    }, DEBOUNCE_TIME);
  });

  // beforeunloadイベントでフラッシュ
  window.addEventListener('beforeunload', handleBeforeUnload);
}

/**
 * 自動保存を停止する
 */
export function stopAutoSave(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  window.removeEventListener('beforeunload', handleBeforeUnload);
  hasPendingSave = false;
}

/**
 * 未保存の変更を即座に保存する
 */
export async function flushAutoSave(): Promise<void> {
  // debounceタイマーをクリア
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // 保留中の保存があれば実行
  if (hasPendingSave) {
    await performSave();
  }
}

/**
 * beforeunloadイベントハンドラ
 * 未保存の変更を同期的にフラッシュする
 */
function handleBeforeUnload(): void {
  // 保留中の保存があれば即座に実行
  if (hasPendingSave && debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;

    // 同期的に保存を試みる（ブラウザがページを閉じる前に実行）
    // Note: beforeunloadは同期処理が推奨されるが、IndexedDBは非同期API
    // 実際にはdebounce 1秒なので、大半のケースではbeforeunload前に保存済み
    void performSave();
  }
}

/**
 * 現在実行中の保存Promiseを取得する（テスト用）
 * @returns 保存Promise（実行中でない場合はnull）
 */
export function _getCurrentSavePromise(): Promise<void> | null {
  return currentSavePromise;
}
