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

function getMockStore() {
  return {
    persons: [] as { id: string; name: string; createdAt: string }[],
    addPerson: mockAddPerson,
    addRelationship: mockAddRelationship,
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
    vi.clearAllMocks();
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
            isDirected: true,
            symmetric: {
              closeness: null,
              trust: null,
              tension: null,
              secrecy: null,
              kinship: null,
            },
            forward: { label: '好き', affection: null, awareness: null, role: null },
            reverse: { label: null, affection: null, awareness: null, role: null },
            tags: ['片想い'],
            narrative: { summary: null, notes: null, turningPoints: [] },
          },
        ],
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
      extractionResult: { persons: [], relationships: [] },
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
            isDirected: false,
            symmetric: {
              closeness: null,
              trust: null,
              tension: null,
              secrecy: null,
              kinship: null,
            },
            forward: { label: '友人', affection: null, awareness: null, role: null },
            reverse: { label: null, affection: null, awareness: null, role: null },
            tags: ['友人'],
            narrative: { summary: null, notes: null, turningPoints: [] },
          },
        ],
      },
      reset: mockReset,
    });

    render(<ChatInputBar />);
    fireEvent.click(screen.getByRole('button', { name: /追加/ }));

    await waitFor(() => {
      expect(mockAddPerson).toHaveBeenCalled();
      expect(mockReset).toHaveBeenCalled();
    });
  });
});
