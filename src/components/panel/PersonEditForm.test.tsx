/**
 * PersonEditFormコンポーネントのテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonEditForm } from './PersonEditForm';
import { useGraphStore } from '@/stores/useGraphStore';
import { readFileAsDataUrl } from '@/lib/image-utils';
import type { Person } from '@/types/person';

// Zustandストアをモック
vi.mock('@/stores/useGraphStore');

// image-utilsをモック
vi.mock('@/lib/image-utils', () => ({
  readFileAsDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,raw-image'),
  cropImage: vi.fn().mockResolvedValue('data:image/jpeg;base64,mock-image'),
}));

// ImageCropperをモック（クロップUIをスキップ）
vi.mock('@/components/ui/ImageCropper', () => ({
  default: ({ onComplete }: { onComplete: (image: string) => void }) => {
    // モックでは即座にクロップ完了を呼ぶ
    setTimeout(() => onComplete('data:image/jpeg;base64,mock-image'), 0);
    return null;
  },
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
    vi.mocked(useGraphStore).mockImplementation((selector: unknown) => {
      const state = {
        updatePerson: mockUpdatePerson,
        removePerson: mockRemovePerson,
      };
      return typeof selector === 'function' ? selector(state) : state;
    });
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

      // readFileAsDataUrlが呼ばれることを確認
      await waitFor(() => {
        expect(vi.mocked(readFileAsDataUrl)).toHaveBeenCalledWith(file);
      });
    });

    it('アイコン領域からドラッグが離れると、視覚的フィードバックが解除される', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');

      // ドラッグオーバーイベントを発火
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'dataTransfer', {
        value: { files: [] },
      });
      fireEvent(iconArea, dragOverEvent);

      // ドラッグ中のスタイルが適用されることを確認
      expect(iconArea).toHaveClass('ring-4');

      // ドラッグリーブイベントを発火
      const dragLeaveEvent = new Event('dragleave', { bubbles: true });
      Object.defineProperty(dragLeaveEvent, 'dataTransfer', {
        value: { files: [] },
      });
      fireEvent(iconArea, dragLeaveEvent);

      // ドラッグ中のスタイルが解除されることを確認
      expect(iconArea).not.toHaveClass('ring-4');
      expect(iconArea).toHaveClass('border-4');
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

      // readFileAsDataUrlが呼ばれることを確認
      await waitFor(() => {
        expect(vi.mocked(readFileAsDataUrl)).toHaveBeenCalledWith(file);
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

      // readFileAsDataUrlが1回目呼ばれることを確認
      await waitFor(() => {
        expect(vi.mocked(readFileAsDataUrl)).toHaveBeenCalledTimes(1);
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

      // readFileAsDataUrlが2回目も呼ばれることを確認（input valueがクリアされている場合）
      await waitFor(() => {
        expect(vi.mocked(readFileAsDataUrl)).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('画像処理が失敗した時、エラーメッセージが表示される', async () => {
      // readFileAsDataUrlをエラーをスローするようにモック
      vi.mocked(readFileAsDataUrl).mockRejectedValueOnce(new Error('画像処理に失敗しました'));

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

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/画像処理に失敗しました/)).toBeInTheDocument();
      });
    });

    it('非画像ファイルをドロップした時、エラーメッセージが表示される', async () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');

      // 非画像ファイルを作成
      const file = new File(['text content'], 'test.txt', { type: 'text/plain' });

      // ドロップイベントを発火
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [file] },
      });
      fireEvent(iconArea, dropEvent);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/画像ファイルのみアップロード可能です/)).toBeInTheDocument();
      });
    });
  });

  describe('名前入力', () => {
    it('名前入力後Enterキー押下でupdatePersonが呼ばれる', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const nameInput = screen.getByLabelText('名前');

      // 名前を入力（この時点ではupdatePersonは呼ばれない）
      fireEvent.change(nameInput, { target: { value: '山田次郎' } });
      expect(mockUpdatePerson).not.toHaveBeenCalled();

      // Enterキーを押す
      fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });

      // updatePersonが呼ばれることを確認
      expect(mockUpdatePerson).toHaveBeenCalledWith(mockPerson.id, {
        name: '山田次郎',
        imageDataUrl: mockPerson.imageDataUrl,
      });
    });

    it('名前が空文字でEnterを押してもupdatePersonが呼ばれない', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const nameInput = screen.getByLabelText('名前');

      // 空白のみを入力
      fireEvent.change(nameInput, { target: { value: '   ' } });

      // Enterキーを押す
      fireEvent.keyDown(nameInput, { key: 'Enter', code: 'Enter' });

      // updatePersonが呼ばれないことを確認
      expect(mockUpdatePerson).not.toHaveBeenCalled();
    });

    it('変換中（isComposing）のEnterは無視される', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const nameInput = screen.getByLabelText('名前');

      // 名前を入力
      fireEvent.change(nameInput, { target: { value: '山田次郎' } });

      // 変換中のEnterキー（isComposing: true）
      const composingEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
      });
      Object.defineProperty(composingEvent, 'isComposing', {
        value: true,
        writable: false,
      });
      fireEvent(nameInput, composingEvent);

      // updatePersonが呼ばれないことを確認
      expect(mockUpdatePerson).not.toHaveBeenCalled();

      // 変換確定後のEnterキー（isComposing: false）
      const confirmEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        bubbles: true,
      });
      Object.defineProperty(confirmEvent, 'isComposing', {
        value: false,
        writable: false,
      });
      fireEvent(nameInput, confirmEvent);

      // updatePersonが呼ばれることを確認
      expect(mockUpdatePerson).toHaveBeenCalledWith(mockPerson.id, {
        name: '山田次郎',
        imageDataUrl: mockPerson.imageDataUrl,
      });
    });

    it('画像D&D時に即座にupdatePersonが呼ばれる', async () => {
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

      // updatePersonが呼ばれることを確認
      await waitFor(() => {
        expect(mockUpdatePerson).toHaveBeenCalledWith(mockPerson.id, {
          name: mockPerson.name,
          imageDataUrl: 'data:image/jpeg;base64,mock-image',
        });
      });
    });

    it('画像削除時に即座にupdatePersonが呼ばれる', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const deleteButton = screen.getByText('画像を削除');
      fireEvent.click(deleteButton);

      // updatePersonが呼ばれることを確認
      expect(mockUpdatePerson).toHaveBeenCalledWith(mockPerson.id, {
        name: mockPerson.name,
        imageDataUrl: undefined,
      });
    });

    it('保存ボタンが存在しない', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      // 保存ボタンが存在しないことを確認
      expect(screen.queryByText('保存')).not.toBeInTheDocument();
    });
  });

  describe('キーボードアクセシビリティ', () => {
    it('Escキーを押すとメニューが閉じる', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      // メニューが表示されることを確認
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();

      // Escキーを押す
      fireEvent.keyDown(document, { key: 'Escape' });

      // メニューが閉じることを確認
      expect(screen.queryByText('画像をアップロード')).not.toBeInTheDocument();
    });

    it('Enterキーでアイコン領域をクリックできる', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');

      // Enterキーを押す
      fireEvent.keyDown(iconArea, { key: 'Enter' });

      // メニューが表示されることを確認
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
    });

    it('Spaceキーでアイコン領域をクリックできる', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');

      // Spaceキーを押す
      fireEvent.keyDown(iconArea, { key: ' ' });

      // メニューが表示されることを確認
      expect(screen.getByText('画像をアップロード')).toBeInTheDocument();
    });

    it('ArrowDownキーでメニュー内を下に移動できる（3項目）', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const uploadButton = screen.getByText('画像をアップロード');
      const pasteButton = screen.getByText('クリップボードから貼り付け');
      const deleteButton = screen.getByText('画像を削除');

      // 最初のボタンにフォーカス
      uploadButton.focus();

      // ArrowDownキーを押す（アップロード → クリップボード）
      fireEvent.keyDown(uploadButton, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(pasteButton);

      // ArrowDownキーを押す（クリップボード → 削除）
      fireEvent.keyDown(pasteButton, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(deleteButton);

      // ArrowDownキーを押す（削除 → アップロード）
      fireEvent.keyDown(deleteButton, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(uploadButton);
    });

    it('ArrowUpキーでメニュー内を上に移動できる（3項目）', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const uploadButton = screen.getByText('画像をアップロード');
      const pasteButton = screen.getByText('クリップボードから貼り付け');
      const deleteButton = screen.getByText('画像を削除');

      // 削除ボタンにフォーカス
      deleteButton.focus();

      // ArrowUpキーを押す（削除 → クリップボード）
      fireEvent.keyDown(deleteButton, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(pasteButton);

      // ArrowUpキーを押す（クリップボード → アップロード）
      fireEvent.keyDown(pasteButton, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(uploadButton);

      // ArrowUpキーを押す（アップロード → 削除）
      fireEvent.keyDown(uploadButton, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(deleteButton);
    });
  });

  describe('クリップボードからの画像貼り付け', () => {
    let originalClipboard: Clipboard | undefined;

    beforeEach(() => {
      // 元のnavigator.clipboardを保存
      originalClipboard = navigator.clipboard;
    });

    afterEach(() => {
      // navigator.clipboardを復元
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        writable: true,
        configurable: true,
      });
    });

    it('メニューに「クリップボードから貼り付け」が表示される', () => {
      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      // メニューに「クリップボードから貼り付け」が表示されることを確認
      expect(screen.getByText('クリップボードから貼り付け')).toBeInTheDocument();
    });

    it('クリップボードに画像がある場合、readFileAsDataUrlが呼ばれる', async () => {
      // Clipboard APIをモック
      const mockBlob = new Blob(['mock-image'], { type: 'image/png' });
      const mockClipboardItem = {
        types: ['image/png'],
        getType: vi.fn().mockResolvedValue(mockBlob),
      };

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          read: vi.fn().mockResolvedValue([mockClipboardItem]),
        },
        writable: true,
        configurable: true,
      });

      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);

      // readFileAsDataUrlが呼ばれることを確認
      await waitFor(() => {
        expect(vi.mocked(readFileAsDataUrl)).toHaveBeenCalled();
      });
    });

    it('クリップボードに画像がない場合、エラーメッセージが表示される', async () => {
      // Clipboard APIをモック（画像なし）
      const mockClipboardItem = {
        types: ['text/plain'],
        getType: vi.fn(),
      };

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          read: vi.fn().mockResolvedValue([mockClipboardItem]),
        },
        writable: true,
        configurable: true,
      });

      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('クリップボードに画像がありません')).toBeInTheDocument();
      });
    });

    it('クリップボードアクセスが拒否された場合、エラーメッセージが表示される', async () => {
      // Clipboard APIをモック（権限拒否）
      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          read: vi.fn().mockRejectedValue(notAllowedError),
        },
        writable: true,
        configurable: true,
      });

      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('クリップボードへのアクセスが許可されていません')).toBeInTheDocument();
      });
    });

    it('Clipboard APIが未対応の場合、エラーメッセージが表示される', async () => {
      // Clipboard APIを未定義にする
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      render(<PersonEditForm person={mockPerson} onClose={mockOnClose} />);

      const iconArea = screen.getByTestId('person-icon-area');
      fireEvent.click(iconArea);

      const pasteButton = screen.getByText('クリップボードから貼り付け');
      fireEvent.click(pasteButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('このブラウザではクリップボードからの貼り付けに対応していません')).toBeInTheDocument();
      });
    });
  });
});
