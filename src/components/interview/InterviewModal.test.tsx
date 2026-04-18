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

// useInterviewChat をモック
vi.mock('@/hooks/useInterviewChat', () => ({
  useInterviewChat: vi.fn(() => ({
    messages: [] as Array<{ id: string; role: 'user' | 'assistant'; content: string }>,
    append: vi.fn(),
    setMessages: vi.fn(),
    isLoading: false,
    chatError: null,
    endSession: vi.fn(),
  })),
}));

// useGraphStore をモック
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (s: { persons: unknown[] }) => unknown) => {
    return selector({ persons: [] });
  }),
}));

// useAiSettingsStore をモック
vi.mock('@/stores/useAiSettingsStore', () => ({
  useAiSettingsStore: vi.fn((selector: (s: { isConfigured: () => boolean }) => unknown) => {
    return selector({ isConfigured: () => true });
  }),
}));

// person-matching をモック
vi.mock('@/lib/person-matching', () => ({
  resolveExtractionResult: vi.fn(() => ({ newPersons: [], relationships: [] })),
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
});
