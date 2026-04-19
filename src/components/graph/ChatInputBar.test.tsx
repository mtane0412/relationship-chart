/**
 * ChatInputBar コンポーネントのテスト
 *
 * フローティングチャット入力バーのUI状態遷移を検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInputBar } from './ChatInputBar';

// useExtractRelationships をモック
const mockExtract = vi.fn();
const mockReset = vi.fn();

vi.mock('@/hooks/useExtractRelationships', () => ({
  useExtractRelationships: vi.fn(() => ({
    extract: mockExtract,
    isLoading: false,
    error: null,
    extractionResult: null,
    reset: mockReset,
  })),
}));

// useGraphStore をモック
const mockAddPerson = vi.fn();
const mockAddRelationship = vi.fn();
const mockCreateEpisode = vi.fn(() => 'episode-new-id');
const mockAddParticipation = vi.fn();

function getMockStore() {
  return {
    persons: [] as { id: string; name: string; createdAt: string }[],
    addPerson: mockAddPerson,
    addRelationship: mockAddRelationship,
    createEpisode: mockCreateEpisode,
    addParticipation: mockAddParticipation,
  };
}

vi.mock('@/stores/useGraphStore', () => {
  const mockUseGraphStore = vi.fn(
    (selector: (s: ReturnType<typeof getMockStore>) => unknown) => {
      const store = getMockStore();
      return selector ? selector(store) : store;
    }
  );
  Object.defineProperty(mockUseGraphStore, 'getState', {
    value: () => getMockStore(),
    writable: true,
  });
  return { useGraphStore: mockUseGraphStore };
});

import { useExtractRelationships } from '@/hooks/useExtractRelationships';
const mockUseExtractRelationships = vi.mocked(useExtractRelationships);

describe('ChatInputBar', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('テキスト入力エリアが表示されること', () => {
    render(<ChatInputBar />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('入力なしでは送信ボタンが無効化されること', () => {
    render(<ChatInputBar />);
    const submitButton = screen.getByRole('button', { name: /送信/ });
    expect(submitButton).toBeDisabled();
  });

  it('テキスト入力後に送信ボタンが有効化されること', () => {
    render(<ChatInputBar />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'テスト入力テキスト' } });
    const submitButton = screen.getByRole('button', { name: /送信/ });
    expect(submitButton).not.toBeDisabled();
  });

  it('送信ボタンをクリックすると extract が呼ばれること', () => {
    render(<ChatInputBar />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '田中と山田は友人だ' } });
    const submitButton = screen.getByRole('button', { name: /送信/ });
    fireEvent.click(submitButton);
    expect(mockExtract).toHaveBeenCalledWith('田中と山田は友人だ');
  });

  it('ローディング中はテキストエリアが無効化されること', () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: true,
      error: null,
      extractionResult: null,
      reset: mockReset,
    });

    render(<ChatInputBar />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('エラーがある場合はエラーメッセージが表示されること', () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: 'APIキーが設定されていません',
      extractionResult: null,
      reset: mockReset,
    });

    render(<ChatInputBar />);
    expect(screen.getByText(/APIキーが設定されていません/)).toBeInTheDocument();
  });

  it('抽出結果がある場合はプレビューパネルが表示されること', () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: null,
      extractionResult: {
        persons: [
          { name: '田中太郎', labels: ['人物'] },
          { name: '山田花子', labels: ['人物'] },
        ],
        relationships: [
          {
            sourcePersonName: '田中太郎',
            targetPersonName: '山田花子',
            type: '好き',
            label: null,
            symmetric: false,
            tags: ['片想い'],
            narrative: { summary: null, notes: null },
            properties: {},
          },
        ],
        episodes: [],
      },
      reset: mockReset,
    });

    render(<ChatInputBar />);
    expect(screen.getByText(/抽出結果を確認/)).toBeInTheDocument();
    expect(screen.getAllByText('田中太郎').length).toBeGreaterThan(0);
    expect(screen.getAllByText('山田花子').length).toBeGreaterThan(0);
  });

  it('プレビューのキャンセルボタンで reset が呼ばれること', () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: null,
      extractionResult: { persons: [], relationships: [], episodes: [] },
      reset: mockReset,
    });

    render(<ChatInputBar />);
    fireEvent.click(screen.getByRole('button', { name: /キャンセル/ }));
    expect(mockReset).toHaveBeenCalled();
  });

  it('プレビューで「相関図に追加」をクリックすると addPerson と addRelationship が呼ばれること', async () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: null,
      extractionResult: {
        persons: [
          { name: '新キャラA', labels: ['人物'] },
          { name: '新キャラB', labels: ['人物'] },
        ],
        relationships: [
          {
            sourcePersonName: '新キャラA',
            targetPersonName: '新キャラB',
            type: '友人',
            label: null,
            symmetric: true,
            tags: ['友人'],
            narrative: { summary: null, notes: null },
            properties: {},
          },
        ],
        episodes: [],
      },
      reset: mockReset,
    });

    render(<ChatInputBar />);
    fireEvent.click(screen.getByRole('button', { name: /追加/ }));

    await waitFor(() => {
      expect(mockAddPerson).toHaveBeenCalled();
      expect(mockAddRelationship).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalled();
    });
  });

  it('抽出結果にエピソードがある場合 createEpisode と addParticipation が呼ばれること', async () => {
    // persons を空にして、エピソード参加者の解決が正常に動作するかをテスト
    // 参加者名 '田中太郎'・'山田花子' が persons に存在する状態でエピソードを解決する
    const mockGetState = vi.fn().mockReturnValue({
      persons: [
        { id: 'p1', name: '田中太郎', createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'p2', name: '山田花子', createdAt: '2024-01-01T00:00:00.000Z' },
      ],
      addPerson: mockAddPerson,
      addRelationship: mockAddRelationship,
      createEpisode: mockCreateEpisode,
      addParticipation: mockAddParticipation,
    });
    const { useGraphStore } = await import('@/stores/useGraphStore');
    vi.mocked(useGraphStore).getState = mockGetState;

    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: null,
      extractionResult: {
        persons: [
          { name: '田中太郎', labels: ['人物'] },
          { name: '山田花子', labels: ['人物'] },
        ],
        relationships: [],
        episodes: [
          {
            title: '初めての出会い',
            description: null,
            occurredAt: null,
            participantNames: ['田中太郎', '山田花子'],
          },
        ],
      },
      reset: mockReset,
    });

    render(<ChatInputBar />);
    fireEvent.click(screen.getByRole('button', { name: /追加/ }));

    await waitFor(() => {
      // エピソード作成が呼ばれること
      expect(mockCreateEpisode).toHaveBeenCalledWith(
        expect.objectContaining({ title: '初めての出会い' })
      );
      // 参加エッジが追加されること（2人分）
      expect(mockAddParticipation).toHaveBeenCalledTimes(2);
      expect(mockReset).toHaveBeenCalled();
    });
  });
});
