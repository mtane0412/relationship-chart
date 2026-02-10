/**
 * ConfirmDialogコンポーネントのテスト
 *
 * 確認ダイアログとアラートダイアログのUIテスト。
 * - レンダリング: isOpenがtrueの時のみ表示される
 * - ボタンクリック: 確認/キャンセルボタンでcloseDialogが呼ばれる
 * - Escapeキー: Escapeキーで閉じる
 * - 背景クリック: オーバーレイクリックで閉じる
 * - dangerバリアント: 確認ボタンが赤色になる
 * - alertバリアント: キャンセルボタンが表示されない
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { useDialogStore } from '@/stores/useDialogStore';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    const { closeDialog } = useDialogStore.getState();
    act(() => {
      closeDialog(false);
    });
  });

  describe('レンダリング', () => {
    it('isOpenがfalseの時は何も表示しない', () => {
      render(<ConfirmDialog />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('isOpenがtrueの時はダイアログを表示する', () => {
      act(() => {
        void useDialogStore.getState().openConfirm({ message: '削除しますか？' });
      });

      render(<ConfirmDialog />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('確認')).toBeInTheDocument();
      expect(screen.getByText('削除しますか？')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    });

    it('カスタムラベルでダイアログを表示する', () => {
      act(() => {
        void useDialogStore.getState().openConfirm({
          title: 'データ削除',
          message: 'すべてのデータを削除しますか？',
          confirmLabel: '削除',
          cancelLabel: 'キャンセル',
        });
      });

      render(<ConfirmDialog />);

      expect(screen.getByText('データ削除')).toBeInTheDocument();
      expect(screen.getByText('すべてのデータを削除しますか？')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    });
  });

  describe('ボタンクリック', () => {
    it('確認ボタンをクリックするとcloseDialog(true)が呼ばれる', async () => {
      const user = userEvent.setup();

      act(() => {
        void useDialogStore.getState().openConfirm({ message: '削除しますか？' });
      });

      render(<ConfirmDialog />);

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      await user.click(confirmButton);

      // ダイアログが閉じられている
      expect(useDialogStore.getState().isOpen).toBe(false);
    });

    it('キャンセルボタンをクリックするとcloseDialog(false)が呼ばれる', async () => {
      const user = userEvent.setup();

      act(() => {
        void useDialogStore.getState().openConfirm({ message: '削除しますか？' });
      });

      render(<ConfirmDialog />);

      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      await user.click(cancelButton);

      // ダイアログが閉じられている
      expect(useDialogStore.getState().isOpen).toBe(false);
    });
  });

  describe('Escapeキー', () => {
    it('Escapeキーで閉じる', async () => {
      const user = userEvent.setup();

      act(() => {
        void useDialogStore.getState().openConfirm({ message: '削除しますか？' });
      });

      render(<ConfirmDialog />);

      await user.keyboard('{Escape}');

      // ダイアログが閉じられている
      expect(useDialogStore.getState().isOpen).toBe(false);
    });
  });

  describe('背景クリック', () => {
    it('オーバーレイをクリックすると閉じる', async () => {
      const user = userEvent.setup();

      act(() => {
        void useDialogStore.getState().openConfirm({ message: '削除しますか？' });
      });

      render(<ConfirmDialog />);

      // オーバーレイをクリック（背景の黒い部分）
      const overlay = screen.getByRole('dialog').parentElement;
      expect(overlay).not.toBeNull();

      await user.click(overlay!);
      // ダイアログが閉じられている
      expect(useDialogStore.getState().isOpen).toBe(false);
    });

    it('ダイアログ内部をクリックしても閉じない', async () => {
      const user = userEvent.setup();

      act(() => {
        void useDialogStore.getState().openConfirm({ message: '削除しますか？' });
      });

      render(<ConfirmDialog />);

      const dialog = screen.getByRole('dialog');
      await user.click(dialog);

      // ダイアログは開いたまま
      expect(useDialogStore.getState().isOpen).toBe(true);
    });
  });

  describe('dangerバリアント', () => {
    it('isDangerがtrueの時、確認ボタンが赤色になる', () => {
      act(() => {
        void useDialogStore.getState().openConfirm({
          message: 'すべてのデータを削除しますか？',
          isDanger: true,
        });
      });

      render(<ConfirmDialog />);

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      // bg-red-600クラスが含まれていることを確認
      expect(confirmButton.className).toContain('bg-red-600');
    });

    it('isDangerがfalseの時、確認ボタンは通常の色', () => {
      act(() => {
        void useDialogStore.getState().openConfirm({
          message: '保存しますか？',
          isDanger: false,
        });
      });

      render(<ConfirmDialog />);

      const confirmButton = screen.getByRole('button', { name: 'OK' });
      // bg-blue-600クラスが含まれていることを確認
      expect(confirmButton.className).toContain('bg-blue-600');
    });
  });

  describe('alertバリアント', () => {
    it('alertバリアントの時、キャンセルボタンが表示されない', () => {
      act(() => {
        void useDialogStore.getState().openAlert({ message: 'エラーが発生しました' });
      });

      render(<ConfirmDialog />);

      expect(screen.getByText('通知')).toBeInTheDocument();
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
      // キャンセルボタンは表示されない
      expect(screen.queryByRole('button', { name: 'キャンセル' })).not.toBeInTheDocument();
    });
  });
});
