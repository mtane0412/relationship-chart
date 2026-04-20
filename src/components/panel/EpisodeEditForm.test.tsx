/**
 * EpisodeEditForm のテスト
 * エピソードノードの編集フォームの振る舞いを検証する
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EpisodeEditForm } from './EpisodeEditForm';
import type { Episode } from '@/types/episode';

// モック関数を vi.hoisted でホイストし、vi.mock より前に初期化する
const { mockUpdateEpisode, mockDeleteEpisode, mockOpenConfirm } = vi.hoisted(() => ({
  mockUpdateEpisode: vi.fn(),
  mockDeleteEpisode: vi.fn(),
  mockOpenConfirm: vi.fn().mockResolvedValue(true),
}));

// useGraphStore をモック
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (state: unknown) => unknown) => {
    const state = {
      updateEpisode: mockUpdateEpisode,
      deleteEpisode: mockDeleteEpisode,
      relationships: [],
    };
    return selector(state);
  }),
}));

// useDialogStore をモック
vi.mock('@/stores/useDialogStore', () => ({
  useDialogStore: vi.fn(
    (selector: (state: { openConfirm: typeof mockOpenConfirm }) => unknown) =>
      selector({ openConfirm: mockOpenConfirm })
  ),
}));

const baseEpisode: Episode = {
  id: 'ep-001',
  title: '初めての出会い',
  description: '二人が公園で出会った日',
  occurredAt: '第1話',
  relatedRelationshipIds: [],
  properties: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('EpisodeEditForm', () => {
  beforeEach(() => {
    mockUpdateEpisode.mockClear();
    mockDeleteEpisode.mockClear();
    mockOpenConfirm.mockClear();
    mockOpenConfirm.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期表示', () => {
    it('タイトルフィールドに現在のtitleが表示される', () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      // タイトル入力フィールドに初期値が表示される
      const titleInput = screen.getByRole('textbox', { name: /タイトル/i });
      expect(titleInput).toHaveValue('初めての出会い');
    });

    it('説明フィールドに現在のdescriptionが表示される', () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const descInput = screen.getByRole('textbox', { name: /説明/i });
      expect(descInput).toHaveValue('二人が公園で出会った日');
    });

    it('発生日時フィールドに現在のoccurredAtが表示される', () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const dateInput = screen.getByRole('textbox', { name: /発生日時/i });
      expect(dateInput).toHaveValue('第1話');
    });

    it('削除ボタンが表示される', () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      expect(screen.getByRole('button', { name: /削除/i })).toBeInTheDocument();
    });
  });

  describe('タイトル保存', () => {
    it('Enterキーを押すとタイトルが保存される', async () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const titleInput = screen.getByRole('textbox', { name: /タイトル/i });
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, '再会の喜び');
      fireEvent.keyDown(titleInput, { key: 'Enter' });

      expect(mockUpdateEpisode).toHaveBeenCalledWith('ep-001', expect.objectContaining({
        title: '再会の喜び',
      }));
    });

    it('Enterキー（IME変換確定）では保存されない', () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const titleInput = screen.getByRole('textbox', { name: /タイトル/i });
      // IME変換中（isComposing=true）のEnterキー: KeyboardEventInit で isComposing を指定
      fireEvent.keyDown(titleInput, { key: 'Enter', isComposing: true });

      expect(mockUpdateEpisode).not.toHaveBeenCalled();
    });

    it('フォーカスを外すと（blur）タイトルが保存される', async () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const titleInput = screen.getByRole('textbox', { name: /タイトル/i });
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, '波乱の展開');
      fireEvent.blur(titleInput);

      expect(mockUpdateEpisode).toHaveBeenCalledWith('ep-001', expect.objectContaining({
        title: '波乱の展開',
      }));
    });

    it('空のタイトルでblurしても保存されず元の値に戻る', async () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const titleInput = screen.getByRole('textbox', { name: /タイトル/i });
      await userEvent.clear(titleInput);
      fireEvent.blur(titleInput);

      // 保存されない
      expect(mockUpdateEpisode).not.toHaveBeenCalled();
      // フィールドが元の値に戻る
      expect(titleInput).toHaveValue('初めての出会い');
    });
  });

  describe('説明・日時保存', () => {
    it('説明フィールドをblurすると保存される', async () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const descInput = screen.getByRole('textbox', { name: /説明/i });
      await userEvent.clear(descInput);
      await userEvent.type(descInput, '試練の冬が訪れた');
      fireEvent.blur(descInput);

      expect(mockUpdateEpisode).toHaveBeenCalledWith('ep-001', expect.objectContaining({
        description: '試練の冬が訪れた',
      }));
    });

    it('発生日時フィールドをblurすると保存される', async () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const dateInput = screen.getByRole('textbox', { name: /発生日時/i });
      await userEvent.clear(dateInput);
      await userEvent.type(dateInput, '第3話');
      fireEvent.blur(dateInput);

      expect(mockUpdateEpisode).toHaveBeenCalledWith('ep-001', expect.objectContaining({
        occurredAt: '第3話',
      }));
    });
  });

  describe('削除', () => {
    it('削除ボタンをクリックすると確認ダイアログが表示される', () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const deleteButton = screen.getByRole('button', { name: /削除/i });
      fireEvent.click(deleteButton);

      expect(mockOpenConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ isDanger: true })
      );
    });

    it('確認OKでdeleteEpisodeが呼ばれる', async () => {
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const deleteButton = screen.getByRole('button', { name: /削除/i });
      fireEvent.click(deleteButton);
      // openConfirmのPromise解決を待つ
      await vi.waitFor(() => expect(mockDeleteEpisode).toHaveBeenCalled());

      expect(mockDeleteEpisode).toHaveBeenCalledWith('ep-001');
    });

    it('確認キャンセルでdeleteEpisodeが呼ばれない', async () => {
      mockOpenConfirm.mockResolvedValue(false);
      render(<EpisodeEditForm episode={baseEpisode} onClose={vi.fn()} />);

      const deleteButton = screen.getByRole('button', { name: /削除/i });
      fireEvent.click(deleteButton);
      await vi.waitFor(() => expect(mockOpenConfirm).toHaveBeenCalled());

      expect(mockDeleteEpisode).not.toHaveBeenCalled();
    });

    it('削除後にonCloseが呼ばれ、deleteEpisodeの後に呼ばれる', async () => {
      const onClose = vi.fn();
      render(<EpisodeEditForm episode={baseEpisode} onClose={onClose} />);

      const deleteButton = screen.getByRole('button', { name: /削除/i });
      fireEvent.click(deleteButton);
      await vi.waitFor(() => expect(onClose).toHaveBeenCalled());

      // deleteEpisode が onClose より先に呼ばれていること
      expect(mockDeleteEpisode.mock.invocationCallOrder[0])
        .toBeLessThan(onClose.mock.invocationCallOrder[0]);
    });
  });
});
