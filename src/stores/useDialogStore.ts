/**
 * ダイアログストア
 *
 * アプリケーション全体で使用される確認ダイアログとアラートダイアログの状態を管理します。
 * PromiseベースのAPIを提供し、既存の`confirm()`や`alert()`からの移行を容易にします。
 *
 * @example
 * // 確認ダイアログを表示
 * const result = await openConfirm({ message: '削除しますか？' });
 * if (result) {
 *   // 削除処理
 * }
 *
 * @example
 * // アラートダイアログを表示
 * await openAlert({ message: 'エラーが発生しました' });
 */

import { create } from 'zustand';

/** ダイアログのバリアント */
type DialogVariant = 'confirm' | 'alert';

/** 確認ダイアログのオプション */
export type ConfirmOptions = {
  /** ダイアログのタイトル（デフォルト: "確認"） */
  title?: string;
  /** 確認メッセージ */
  message: string;
  /** 確認ボタンのラベル（デフォルト: "OK"） */
  confirmLabel?: string;
  /** キャンセルボタンのラベル（デフォルト: "キャンセル"） */
  cancelLabel?: string;
  /** 危険な操作の場合はtrue（確認ボタンが赤色になる） */
  isDanger?: boolean;
};

/** アラートダイアログのオプション */
export type AlertOptions = {
  /** ダイアログのタイトル（デフォルト: "通知"） */
  title?: string;
  /** アラートメッセージ */
  message: string;
  /** OKボタンのラベル（デフォルト: "OK"） */
  confirmLabel?: string;
};

/** ダイアログの状態 */
type DialogState = {
  /** ダイアログが開いているか */
  isOpen: boolean;
  /** ダイアログのバリアント */
  variant: DialogVariant;
  /** ダイアログのタイトル */
  title: string;
  /** 確認メッセージ */
  message: string;
  /** 確認ボタンのラベル */
  confirmLabel: string;
  /** キャンセルボタンのラベル */
  cancelLabel: string;
  /** 危険な操作の場合はtrue */
  isDanger: boolean;
  /** Promiseのresolve関数 */
  resolve: ((value: boolean) => void) | null;
};

/** ダイアログのアクション */
type DialogActions = {
  /**
   * 確認ダイアログを開く
   * @param options - ダイアログのオプション
   * @returns ユーザーが確認した場合はtrue、キャンセルした場合はfalse
   */
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;

  /**
   * アラートダイアログを開く
   * @param options - ダイアログのオプション
   * @returns OKボタンがクリックされたときに解決されるPromise
   */
  openAlert: (options: AlertOptions) => Promise<void>;

  /**
   * ダイアログを閉じる
   * @param result - 確認ダイアログの結果（trueまたはfalse）
   */
  closeDialog: (result: boolean) => void;
};

/** ダイアログストアの型 */
type DialogStore = DialogState & DialogActions;

/**
 * ダイアログストア
 *
 * 確認ダイアログとアラートダイアログの状態を管理します。
 */
export const useDialogStore = create<DialogStore>((set, get) => ({
  // 初期状態
  isOpen: false,
  variant: 'confirm',
  title: '',
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'キャンセル',
  isDanger: false,
  resolve: null,

  // アクション
  openConfirm: (options) => {
    // 既存のダイアログが開いている場合、既存のPromiseをキャンセル（falseで解決）
    const { resolve: existingResolve } = get();
    if (existingResolve) {
      existingResolve(false);
    }

    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        variant: 'confirm',
        title: options.title ?? '確認',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'OK',
        cancelLabel: options.cancelLabel ?? 'キャンセル',
        isDanger: options.isDanger ?? false,
        resolve,
      });
    });
  },

  openAlert: (options) => {
    // 既存のダイアログが開いている場合、既存のPromiseを解決
    const { resolve: existingResolve } = get();
    if (existingResolve) {
      existingResolve(false);
    }

    return new Promise<void>((resolve) => {
      set({
        isOpen: true,
        variant: 'alert',
        title: options.title ?? '通知',
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'OK',
        cancelLabel: 'キャンセル', // alertでは使用されないが、状態として保持
        isDanger: false,
        resolve: (_value) => {
          resolve();
        },
      });
    });
  },

  closeDialog: (result) => {
    const { resolve } = get();
    if (resolve) {
      resolve(result);
    }
    set({
      isOpen: false,
      resolve: null,
    });
  },
}));
