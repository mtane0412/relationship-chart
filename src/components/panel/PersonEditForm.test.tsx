/**
 * PersonEditFormコンポーネントのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonEditForm } from './PersonEditForm';
import { useGraphStore } from '@/stores/useGraphStore';
import { processImage } from '@/lib/image-utils';
import type { Person } from '@/types/person';

// Zustandストアをモック
vi.mock('@/stores/useGraphStore');

// processImageをモック
vi.mock('@/lib/image-utils', () => ({
  processImage: vi.fn().mockResolvedValue('data:image/jpeg;base64,mock-image'),
}));

describe('PersonEditForm', () => {
  const mockPerson: Person = {
    id: 'person-1',
    name: '山田太郎',
    imageDataUrl: 'data:image/jpeg;base64,existing-image',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  const mockUpdatePerson = vi.fn();
  const mockRemovePerson = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useGraphStore).mockReturnValue({
      updatePerson: mockUpdatePerson,
      removePerson: mockRemovePerson,
    } as never);
  });

  describe('アイコン領域のD&D機能', () => {
    it('アイコン領域に画像をドラッグオーバーすると、視覚的フィードバックが表示される', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');

      // ドラッグオーバーイベントを発火
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { files: [] },
      });
      fireEvent(iconArea, dragOverEvent);

      // ドラッグ中のスタイルが適用されることを確認（ring-4とring-blue-500）
      expect(iconArea).toHaveClass('ring-4');
      expect(iconArea).toHaveClass('ring-blue-500');
    });

    it('アイコン領域に画像をドロップすると、画像が更新される', async () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');

      // 画像ファイルを作成
      const file = new File(['image content'], 'test.png', { type: 'image/png' });

      // ドロップイベントを発火
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [file] },
      });
      fireEvent(iconArea, dropEvent);

      // processImageが呼ばれることを確認
      await waitFor(() => {
        expect(vi.mocked(processImage)).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('アイコンクリック時のメニュー表示', () => {
    it('アイコンをクリックすると、アップロード/削除メニューが表示される', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      // メニューが表示されることを確認
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
      expect(screen.getByText('画像を削除')).toBeInTheDocument();
    });

    it('画像がない場合は「削除」メニューが表示されない', () => {
      const personWithoutImage: Person = {
        ...mockPerson,
        imageDataUrl: undefined,
      };

      render(<PersonEditForm person={personWithoutImage} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      // 「アップロード」のみ表示されることを確認
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
      expect(screen.queryByText('画像を削除')).not.toBeInTheDocument();
    });

    it('メニューの「画像をアップロード」をクリックすると、ファイル選択ダイアログが開く', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const uploadButton = screen.getByText('画像をアップロード');

      // ファイル入力要素を取得
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(uploadButton);

      // ファイル選択ダイアログが開くことを確認
      expect(clickSpy).toHaveBeenCalled();
    });

    it('メニューの「画像を削除」をクリックすると、画像が削除される', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const deleteButton = screen.getByText('画像を削除');
      fireEvent.click(deleteButton);

      // 画像が削除され、プレースホルダーが表示されることを確認
      expect(screen.getByText('山')).toBeInTheDocument(); // 名前の最初の文字
    });
  });

  describe('ファイル選択による画像アップロード', () => {
    it('ファイル選択で画像を選択すると、画像が更新される', async () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const uploadButton = screen.getByText('画像をアップロード');
      fireEvent.click(uploadButton);

      // ファイル入力要素を取得
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // 画像ファイルを作成
      const file = new File(['image content'], 'test.png', { type: 'image/png' });

      // ファイル選択イベントを発火
      Object.defineProperty(fileInput, 'files', {
        value: [file],
      });
      fireEvent.change(fileInput);

      // processImageが呼ばれることを確認
      await waitFor(() => {
        expect(vi.mocked(processImage)).toHaveBeenCalledWith(file);
      });
    });

    it('同じファイルを2回選択すると、2回とも画像が更新される', async () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const uploadButton = screen.getByText('画像をアップロード');
      fireEvent.click(uploadButton);

      // ファイル入力要素を取得
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // 画像ファイルを作成
      const file = new File(['image content'], 'test.png', { type: 'image/png' });

      // 1回目のファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: true,
      });
      fireEvent.change(fileInput);

      // processImageが1回目呼ばれることを確認
      await waitFor(() => {
        expect(vi.mocked(processImage)).toHaveBeenCalledTimes(1);
      });

      // メニューを再度開く
      fireEvent.click(iconArea);
      fireEvent.click(screen.getByText('画像をアップロード'));

      // 2回目の同じファイル選択
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: true,
      });
      fireEvent.change(fileInput);

      // processImageが2回目も呼ばれることを確認（input valueがクリアされている場合）
      await waitFor(() => {
        expect(vi.mocked(processImage)).toHaveBeenCalledTimes(2);
      });
    });
  });
});
