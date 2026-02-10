/**
 * ダイアログストアのテスト
 *
 * useDialogStoreはアプリケーション全体で使用される確認ダイアログとアラートダイアログの状態を管理します。
 * - openConfirm: 確認ダイアログを表示し、ユーザーの選択をPromiseで返す
 * - openAlert: アラートダイアログを表示し、OKボタンでPromiseを解決
 * - closeDialog: ダイアログを閉じ、Promiseを解決
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useDialogStore } from './useDialogStore';

describe('useDialogStore', () => {
  beforeEach(() => {
    // 各テスト前にストアを完全にリセット
    act(() => {
      useDialogStore.setState({
        isOpen: false,
        variant: 'confirm',
        title: '',
        message: '',
        confirmLabel: 'OK',
        cancelLabel: 'キャンセル',
        isDanger: false,
        resolve: null,
      });
    });
  });

  describe('初期状態', () => {
    it('ダイアログが閉じた状態で初期化される', () => {
      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.variant).toBe('confirm');
      expect(state.message).toBe('');
      expect(state.resolve).toBeNull();
    });
  });

  describe('openConfirm', () => {
    it('確認ダイアログを開く', () => {
      const { openConfirm } = useDialogStore.getState();

      // Promiseの解決を待たずに、ストアの状態のみ確認
      void openConfirm({ message: '削除しますか？' });

      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.variant).toBe('confirm');
      expect(state.message).toBe('削除しますか？');
      expect(state.title).toBe('確認');
      expect(state.confirmLabel).toBe('OK');
      expect(state.cancelLabel).toBe('キャンセル');
      expect(state.isDanger).toBe(false);
      expect(state.resolve).not.toBeNull();
    });

    it('カスタムオプションで確認ダイアログを開く', () => {
      const { openConfirm } = useDialogStore.getState();

      void openConfirm({
        title: 'データ削除',
        message: 'すべてのデータを削除しますか？',
        confirmLabel: '削除',
        cancelLabel: 'キャンセル',
        isDanger: true,
      });

      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.variant).toBe('confirm');
      expect(state.title).toBe('データ削除');
      expect(state.message).toBe('すべてのデータを削除しますか？');
      expect(state.confirmLabel).toBe('削除');
      expect(state.cancelLabel).toBe('キャンセル');
      expect(state.isDanger).toBe(true);
    });

    it('確認時にtrueを返すPromiseを解決する', async () => {
      const { openConfirm, closeDialog } = useDialogStore.getState();

      const promise = openConfirm({ message: '削除しますか？' });

      // ユーザーが確認ボタンをクリック
      act(() => {
        closeDialog(true);
      });

      const result = await promise;
      expect(result).toBe(true);

      // ダイアログが閉じられている
      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(false);
    });

    it('キャンセル時にfalseを返すPromiseを解決する', async () => {
      const { openConfirm, closeDialog } = useDialogStore.getState();

      const promise = openConfirm({ message: '削除しますか？' });

      // ユーザーがキャンセルボタンをクリック
      act(() => {
        closeDialog(false);
      });

      const result = await promise;
      expect(result).toBe(false);

      // ダイアログが閉じられている
      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(false);
    });
  });

  describe('openAlert', () => {
    it('アラートダイアログを開く', () => {
      const { openAlert } = useDialogStore.getState();

      // Promiseの解決を待たずに、ストアの状態のみ確認
      void openAlert({ message: 'エラーが発生しました' });

      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.variant).toBe('alert');
      expect(state.message).toBe('エラーが発生しました');
      expect(state.title).toBe('通知');
      expect(state.confirmLabel).toBe('OK');
      expect(state.resolve).not.toBeNull();
    });

    it('カスタムオプションでアラートダイアログを開く', () => {
      const { openAlert } = useDialogStore.getState();

      void openAlert({
        title: 'エラー',
        message: 'キャプチャに失敗しました',
        confirmLabel: '閉じる',
      });

      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.variant).toBe('alert');
      expect(state.title).toBe('エラー');
      expect(state.message).toBe('キャプチャに失敗しました');
      expect(state.confirmLabel).toBe('閉じる');
    });

    it('OKボタンでPromiseを解決する', async () => {
      const { openAlert, closeDialog } = useDialogStore.getState();

      const promise = openAlert({ message: 'エラーが発生しました' });

      // ユーザーがOKボタンをクリック
      act(() => {
        closeDialog(true);
      });

      await promise;

      // ダイアログが閉じられている
      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(false);
    });
  });

  describe('closeDialog', () => {
    it('resolveがnullの場合でも安全に閉じる', () => {
      const { closeDialog } = useDialogStore.getState();

      // resolveがnullの状態でcloseDialogを呼ぶ
      act(() => {
        closeDialog(false);
      });

      const state = useDialogStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.resolve).toBeNull();
    });
  });
});
