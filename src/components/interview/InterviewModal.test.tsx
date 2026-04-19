/**
 * InterviewModal コンポーネントのユニットテスト
 *
 * AIインタビュアーチャットモーダルの表示・非表示・基本操作を検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InterviewModal } from './InterviewModal';
import { useInterviewStore } from '@/stores/useInterviewStore';
import type { ExtractionResolutionResult } from '@/lib/person-matching';

// useInterviewChat をモック
vi.mock('@/hooks/useInterviewChat', () => ({
  useInterviewChat: vi.fn(() => ({
    messages: [] as Array<{ id: string; role: 'user' | 'assistant'; content: string }>,
    append: vi.fn(),
    setMessages: vi.fn(),
    isLoading: false,
    chatError: null,
    endSession: vi.fn(),
    abort: vi.fn(),
  })),
}));

// useGraphStore をモック
const mockAddPerson = vi.fn();
const mockAddRelationship = vi.fn();
const mockCreateEpisode = vi.fn(() => 'episode-new-id');
const mockAddParticipation = vi.fn();

function getMockGraphStore() {
  return {
    persons: [] as { id: string; name: string; createdAt: string }[],
    addPerson: mockAddPerson,
    addRelationship: mockAddRelationship,
    createEpisode: mockCreateEpisode,
    addParticipation: mockAddParticipation,
    activeChartId: 'chart-001',
  };
}

vi.mock('@/stores/useGraphStore', () => {
  const mockUseGraphStore = vi.fn(
    (selector: (s: ReturnType<typeof getMockGraphStore>) => unknown) => {
      return selector(getMockGraphStore());
    }
  );
  Object.defineProperty(mockUseGraphStore, 'getState', {
    value: () => getMockGraphStore(),
    writable: true,
  });
  return { useGraphStore: mockUseGraphStore };
});

// useAiSettingsStore をモック
vi.mock('@/stores/useAiSettingsStore', () => ({
  useAiSettingsStore: vi.fn((selector: (s: { isConfigured: () => boolean }) => unknown) => {
    return selector({ isConfigured: () => true });
  }),
}));

// person-matching をモック
const mockResolveExtractionResult = vi.fn((): ExtractionResolutionResult => ({
  newPersons: [],
  relationships: [],
  episodes: [],
}));
vi.mock('@/lib/person-matching', () => ({
  resolveExtractionResult: () => mockResolveExtractionResult(),
}));

/** ストア状態をリセットするヘルパー */
function resetStore() {
  useInterviewStore.setState({
    isModalOpen: false,
    session: null,
    extractionResult: null,
    error: null,
  });
}

describe('InterviewModal', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('isModalOpen が false のときモーダルが表示されないこと', () => {
    useInterviewStore.setState({ isModalOpen: false });
    render(<InterviewModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('isModalOpen が true のときモーダルが表示されること', () => {
    useInterviewStore.setState({ isModalOpen: true });
    useInterviewStore.getState().startSession('chart-001');
    render(<InterviewModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('モーダルタイトルが表示されること', () => {
    useInterviewStore.setState({ isModalOpen: true });
    useInterviewStore.getState().startSession('chart-001');
    render(<InterviewModal />);
    expect(screen.getByText('AIインタビュー')).toBeInTheDocument();
  });

  it('閉じるボタン（×）でモーダルが閉じること', () => {
    useInterviewStore.setState({ isModalOpen: true });
    useInterviewStore.getState().startSession('chart-001');
    render(<InterviewModal />);

    const closeButton = screen.getByRole('button', { name: '閉じる' });
    fireEvent.click(closeButton);

    expect(useInterviewStore.getState().isModalOpen).toBe(false);
  });

  it('Escape キーでモーダルが閉じること', async () => {
    useInterviewStore.setState({ isModalOpen: true });
    useInterviewStore.getState().startSession('chart-001');
    render(<InterviewModal />);

    await userEvent.keyboard('{Escape}');

    expect(useInterviewStore.getState().isModalOpen).toBe(false);
  });

  it('extracting 状態でローディングインジケーターが表示されること', () => {
    useInterviewStore.setState({ isModalOpen: true });
    useInterviewStore.getState().startSession('chart-001');
    useInterviewStore.getState().setSessionStatus('extracting');
    render(<InterviewModal />);

    // ローディング状態の表示（「分析中」テキスト）
    expect(screen.getByText(/インタビュー内容を分析中/)).toBeInTheDocument();
  });

  it('セッションがない場合でもモーダルが表示されること', () => {
    useInterviewStore.setState({ isModalOpen: true, session: null });
    render(<InterviewModal />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('プレビューで「相関図に反映」をクリックするとエピソードが追加されること', async () => {
    // エピソードを含む抽出結果をセット
    mockResolveExtractionResult.mockReturnValue({
      newPersons: [],
      relationships: [],
      episodes: [
        {
          title: '卒業式での再会',
          description: '久しぶりの再会を果たした',
          occurredAt: '2023年春',
          participantPersonIds: ['p1', 'p2'],
        },
      ],
    });

    useInterviewStore.setState({ isModalOpen: true });
    useInterviewStore.getState().startSession('chart-001');
    useInterviewStore.getState().setExtractionResult({
      persons: [],
      relationships: [],
      episodes: [],
    });
    useInterviewStore.getState().setSessionStatus('preview');

    render(<InterviewModal />);
    fireEvent.click(screen.getByRole('button', { name: /相関図に追加/ }));

    // エピソード作成が呼ばれること
    expect(mockCreateEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ title: '卒業式での再会' })
    );
    // 参加エッジが2人分追加されること
    expect(mockAddParticipation).toHaveBeenCalledTimes(2);
  });
});
