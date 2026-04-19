/**
 * EpisodeCaptureDialogのテスト
 * エピソード作成/編集ダイアログの入力・バリデーション・IMEガードを検証する
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EpisodeCaptureDialog } from './EpisodeCaptureDialog';
import type { Person } from '@/types/person';

// useGraphStoreをモック（persons一覧の取得に使用）
vi.mock('@/stores/useGraphStore', () => ({
  useGraphStore: vi.fn((selector: (state: { persons: Person[] }) => unknown) =>
    selector({ persons: mockPersons })
  ),
}));

const mockPersons: Person[] = [
  {
    id: 'p-001',
    name: '佐藤 花子',
    labels: [],
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'p-002',
    name: '田中 一郎',
    labels: [],
    properties: {},
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

function makeProps(overrides: Partial<Parameters<typeof EpisodeCaptureDialog>[0]> = {}) {
  return {
    isOpen: true,
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

describe('EpisodeCaptureDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('タイトル必須バリデーション', () => {
    it('タイトルが空のとき保存ボタンが無効化されている', () => {
      render(<EpisodeCaptureDialog {...makeProps()} />);

      const saveButton = screen.getByRole('button', { name: '保存' });
      expect(saveButton).toBeDisabled();
    });

    it('タイトルを入力すると保存ボタンが有効になる', async () => {
      const user = userEvent.setup();
      render(<EpisodeCaptureDialog {...makeProps()} />);

      const titleInput = screen.getByLabelText(/タイトル/);
      await user.type(titleInput, '初めての出会い');

      expect(screen.getByRole('button', { name: '保存' })).toBeEnabled();
    });

    it('タイトルが空白のみのとき保存ボタンが無効化されている', async () => {
      const user = userEvent.setup();
      render(<EpisodeCaptureDialog {...makeProps()} />);

      const titleInput = screen.getByLabelText(/タイトル/);
      await user.type(titleInput, '   ');

      expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    });
  });

  describe('保存処理', () => {
    it('タイトルだけ入力して保存するとonSaveが呼ばれる', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<EpisodeCaptureDialog {...makeProps({ onSave })} />);

      await user.type(screen.getByLabelText(/タイトル/), '再会の場面');
      await user.click(screen.getByRole('button', { name: '保存' }));

      expect(onSave).toHaveBeenCalledWith({
        title: '再会の場面',
        description: undefined,
        occurredAt: undefined,
        participantPersonIds: [],
        relatedRelationshipIds: [],
      });
    });

    it('全フィールドを入力して保存するとonSaveが呼ばれる', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      render(<EpisodeCaptureDialog {...makeProps({ onSave })} />);

      await user.type(screen.getByLabelText(/タイトル/), '決別の夜');
      await user.type(screen.getByLabelText(/説明/), '二人が永遠の別れを告げた');
      await user.type(screen.getByLabelText(/発生日時/), '第12話');

      await user.click(screen.getByRole('button', { name: '保存' }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '決別の夜',
          description: '二人が永遠の別れを告げた',
          occurredAt: '第12話',
        })
      );
    });
  });

  describe('キャンセル処理', () => {
    it('キャンセルボタンでonCancelが呼ばれる', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<EpisodeCaptureDialog {...makeProps({ onCancel })} />);

      await user.click(screen.getByRole('button', { name: 'キャンセル' }));

      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  describe('IMEガード', () => {
    it('IME変換中（isComposing=true）のEnterキーでは保存されない', async () => {
      const onSave = vi.fn();
      render(<EpisodeCaptureDialog {...makeProps({ onSave })} />);

      const titleInput = screen.getByLabelText(/タイトル/);
      fireEvent.change(titleInput, { target: { value: '初恋' } });
      // IME変換中のEnterイベント（isComposing=true）
      // fireEvent.keyDown の isComposing オプションが nativeEvent.isComposing に反映される
      fireEvent.keyDown(titleInput, { key: 'Enter', isComposing: true });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('IME確定後のEnterキーで保存される', () => {
      const onSave = vi.fn();
      render(<EpisodeCaptureDialog {...makeProps({ onSave })} />);

      const titleInput = screen.getByLabelText(/タイトル/);
      fireEvent.change(titleInput, { target: { value: '初恋の季節' } });
      // 通常のEnterキー（isComposing=false）
      fireEvent.keyDown(titleInput, { key: 'Enter' });

      expect(onSave).toHaveBeenCalledOnce();
    });
  });

  describe('初期値（編集モード）', () => {
    it('initialValuesが渡された場合、フォームに初期値が設定される', () => {
      render(
        <EpisodeCaptureDialog
          {...makeProps({
            initialValues: {
              title: '邂逅',
              description: '最初の出会いの場面',
              occurredAt: '第1話',
              participantPersonIds: [],
              relatedRelationshipIds: [],
            },
          })}
        />
      );

      expect(screen.getByLabelText(/タイトル/)).toHaveValue('邂逅');
      expect(screen.getByLabelText(/説明/)).toHaveValue('最初の出会いの場面');
      expect(screen.getByLabelText(/発生日時/)).toHaveValue('第1話');
    });
  });

  describe('表示制御', () => {
    it('isOpen=falseのときダイアログが表示されない', () => {
      render(<EpisodeCaptureDialog {...makeProps({ isOpen: false })} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
