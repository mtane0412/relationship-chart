/**
 * EpisodeListコンポーネントのテスト
 * エピソード一覧の表示・追加ボタン・削除確認・インライン編集を検証する
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EpisodeList } from './EpisodeList';
import type { Episode } from '@/types/episode';

// dnd-kitをモック（テスト環境ではPointerSensorが動作しないため）
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});
vi.mock('@dnd-kit/sortable', async () => {
  const actual = await vi.importActual('@dnd-kit/sortable');
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: null,
      isDragging: false,
    }),
  };
});

// useDialogStoreをモック
vi.mock('@/stores/useDialogStore', () => ({
  useDialogStore: vi.fn((selector: (state: { openConfirm: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ openConfirm: mockOpenConfirm })
  ),
}));

const mockOpenConfirm = vi.fn().mockResolvedValue(true);

// useGraphStoreをモック
const mockDeleteEpisode = vi.fn();
const mockUpdateEpisode = vi.fn();
const mockReorderEpisodes = vi.fn();
const mockCreateEpisode = vi.fn().mockReturnValue('ep-new');
const mockAddParticipation = vi.fn();

vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (state: typeof mockState) => unknown) =>
    selector(mockState)
  ),
}));

const episodeSample: Episode = {
  id: 'ep-001',
  title: '初めての出会い',
  relatedRelationshipIds: [],
  properties: {},
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockState = {
  episodes: [episodeSample],
  episodeParticipations: [],
  persons: [],
  deleteEpisode: mockDeleteEpisode,
  updateEpisode: mockUpdateEpisode,
  reorderEpisodes: mockReorderEpisodes,
  createEpisode: mockCreateEpisode,
  addParticipation: mockAddParticipation,
};

describe('EpisodeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenConfirm.mockResolvedValue(true);
    mockState.episodes = [episodeSample];
  });

  describe('一覧表示', () => {
    it('エピソードのタイトルが表示される', () => {
      render(<EpisodeList />);
      expect(screen.getByText('初めての出会い')).toBeInTheDocument();
    });

    it('エピソードが0件のとき空状態メッセージが表示される', () => {
      mockState.episodes = [];
      render(<EpisodeList />);
      expect(screen.getByText(/エピソードがありません/)).toBeInTheDocument();
    });
  });

  describe('追加ボタン', () => {
    it('「+ エピソードを追加」ボタンが表示される', () => {
      render(<EpisodeList />);
      expect(screen.getByRole('button', { name: /エピソードを追加/ })).toBeInTheDocument();
    });

    it('追加ボタンをクリックするとダイアログが開く', async () => {
      const user = userEvent.setup();
      render(<EpisodeList />);
      await user.click(screen.getByRole('button', { name: /エピソードを追加/ }));
      // ダイアログが表示される
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('削除確認', () => {
    it('削除ボタンをクリックすると確認ダイアログが表示される', async () => {
      const user = userEvent.setup();
      render(<EpisodeList />);
      await user.click(screen.getByRole('button', { name: /削除/ }));
      expect(mockOpenConfirm).toHaveBeenCalledOnce();
    });

    it('確認後にdeleteEpisodeが呼ばれる', async () => {
      const user = userEvent.setup();
      mockOpenConfirm.mockResolvedValueOnce(true);
      render(<EpisodeList />);
      await user.click(screen.getByRole('button', { name: /削除/ }));
      expect(mockDeleteEpisode).toHaveBeenCalledWith('ep-001');
    });

    it('キャンセル時はdeleteEpisodeが呼ばれない', async () => {
      const user = userEvent.setup();
      mockOpenConfirm.mockResolvedValueOnce(false);
      render(<EpisodeList />);
      await user.click(screen.getByRole('button', { name: /削除/ }));
      expect(mockDeleteEpisode).not.toHaveBeenCalled();
    });
  });

  describe('インライン編集', () => {
    it('タイトルをクリックすると編集モードになる', async () => {
      const user = userEvent.setup();
      render(<EpisodeList />);
      await user.click(screen.getByText('初めての出会い'));
      // 入力フィールドが表示される
      expect(screen.getByRole('textbox', { name: /タイトルを編集/ })).toBeInTheDocument();
    });

    it('Enterキーでタイトルを保存する', async () => {
      const user = userEvent.setup();
      render(<EpisodeList />);
      await user.click(screen.getByText('初めての出会い'));
      const input = screen.getByRole('textbox', { name: /タイトルを編集/ });
      await user.clear(input);
      await user.type(input, '再会の場面');
      await user.keyboard('{Enter}');
      expect(mockUpdateEpisode).toHaveBeenCalledWith('ep-001', expect.objectContaining({ title: '再会の場面' }));
    });

    it('IME変換中のEnterキーでは保存されない', () => {
      render(<EpisodeList />);
      fireEvent.click(screen.getByText('初めての出会い'));
      const input = screen.getByRole('textbox', { name: /タイトルを編集/ });
      fireEvent.change(input, { target: { value: '別の題名' } });
      // IME変換中
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
      expect(mockUpdateEpisode).not.toHaveBeenCalled();
    });
  });
});
