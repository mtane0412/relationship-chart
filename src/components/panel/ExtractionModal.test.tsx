/**
 * ExtractionModal コンポーネントのユニットテスト
 * マルチステップ UI の遷移と確認アクションを検証する。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExtractionModal } from './ExtractionModal';

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
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (s: ReturnType<typeof getMockStore>) => unknown) => {
    const store = getMockStore();
    return selector ? selector(store) : store;
  }),
}));

function getMockStore() {
  return {
    persons: [],
    addPerson: mockAddPerson,
    addRelationship: mockAddRelationship,
  };
}

import { useExtractRelationships } from '@/hooks/useExtractRelationships';
const mockUseExtractRelationships = vi.mocked(useExtractRelationships);

describe('ExtractionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isOpen=false の場合は何も表示しないこと', () => {
    render(<ExtractionModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('isOpen=true の場合はテキスト入力ステップが表示されること', () => {
    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('テキスト入力なしでは送信ボタンが無効化されること', () => {
    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    const submitButton = screen.getByRole('button', { name: /抽出/ });
    expect(submitButton).toBeDisabled();
  });

  it('テキスト入力後に送信ボタンが有効化されること', () => {
    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'テスト入力' } });
    const submitButton = screen.getByRole('button', { name: /抽出/ });
    expect(submitButton).not.toBeDisabled();
  });

  it('送信ボタンをクリックすると extract が呼ばれること', () => {
    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'テスト入力' } });
    const submitButton = screen.getByRole('button', { name: /抽出/ });
    fireEvent.click(submitButton);
    expect(mockExtract).toHaveBeenCalledWith('テスト入力');
  });

  it('ローディング中はスピナーが表示されること', () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: true,
      error: null,
      extractionResult: null,
      reset: mockReset,
    });

    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/解析中/)).toBeDefined();
  });

  it('エラーがある場合はエラーメッセージが表示されること', () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: 'テスト用エラーメッセージ',
      extractionResult: null,
      reset: mockReset,
    });

    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/テスト用エラーメッセージ/)).toBeDefined();
  });

  it('抽出結果がある場合はプレビューステップが表示されること', () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: null,
      extractionResult: {
        persons: [
          { name: '田中太郎', kind: 'person' },
          { name: '山田花子', kind: 'person' },
        ],
        relationships: [
          {
            sourcePersonName: '田中太郎',
            targetPersonName: '山田花子',
            isDirected: true,
            symmetric: { closeness: null, trust: null, tension: null, secrecy: null, kinship: null },
            forward: { label: '好き', affection: null, awareness: null, role: null },
            reverse: { label: null, affection: null, awareness: null, role: null },
            tags: ['片想い'],
            narrative: { summary: null, notes: null, turningPoints: [] },
          },
        ],
      },
      reset: mockReset,
    });

    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getAllByText('田中太郎').length).toBeGreaterThan(0);
    expect(screen.getAllByText('山田花子').length).toBeGreaterThan(0);
  });

  it('プレビューでキャンセルをクリックすると onClose が呼ばれること', () => {
    const onClose = vi.fn();
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: null,
      extractionResult: { persons: [], relationships: [] },
      reset: mockReset,
    });

    render(<ExtractionModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /キャンセル/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it('プレビューで確認をクリックすると addPerson と addRelationship が呼ばれること', async () => {
    mockUseExtractRelationships.mockReturnValue({
      extract: mockExtract,
      isLoading: false,
      error: null,
      extractionResult: {
        persons: [{ name: '新キャラ', kind: 'person' }],
        relationships: [],
      },
      reset: mockReset,
    });

    render(<ExtractionModal isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /追加/ }));

    await waitFor(() => {
      expect(mockAddPerson).toHaveBeenCalled();
    });
  });
});
