/**
 * TurningPointsEditor コンポーネントのユニットテスト
 * ターニングポイントの動的リスト編集（追加・削除・変更）を検証する
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TurningPointsEditor } from './TurningPointsEditor';
import type { TurningPointRow } from './TurningPointsEditor';

/** テスト用ターニングポイント行を生成するファクトリ */
function makeRow(id: string, at: string, note: string): TurningPointRow {
  return { id, at, note };
}

describe('TurningPointsEditor', () => {
  describe('描画', () => {
    it('「ターニングポイント」ラベルが表示される', () => {
      render(<TurningPointsEditor value={[]} onChange={vi.fn()} />);
      expect(screen.getByText('ターニングポイント')).toBeInTheDocument();
    });

    it('「+ ターニングポイントを追加」ボタンが表示される', () => {
      render(<TurningPointsEditor value={[]} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: /ターニングポイントを追加/ })).toBeInTheDocument();
    });

    it('既存の行が表示される', () => {
      const rows = [makeRow('r1', '2020年', '出会い'), makeRow('r2', '2022年', '別れ')];
      render(<TurningPointsEditor value={rows} onChange={vi.fn()} />);
      expect(screen.getByDisplayValue('2020年')).toBeInTheDocument();
      expect(screen.getByDisplayValue('出会い')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2022年')).toBeInTheDocument();
      expect(screen.getByDisplayValue('別れ')).toBeInTheDocument();
    });

    it('各行に削除ボタンが表示される', () => {
      const rows = [makeRow('r1', '2020年', '出会い')];
      render(<TurningPointsEditor value={rows} onChange={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'このターニングポイントを削除' })).toBeInTheDocument();
    });
  });

  describe('追加', () => {
    it('追加ボタンをクリックすると onChange が新しい行を含む配列で呼ばれる', async () => {
      const onChange = vi.fn();
      render(<TurningPointsEditor value={[]} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));
      expect(onChange).toHaveBeenCalledTimes(1);
      const [newRows] = onChange.mock.calls[0];
      expect(newRows).toHaveLength(1);
      expect(newRows[0]).toMatchObject({ at: '', note: '' });
    });

    it('既存行がある場合、追加後も既存行が保持される', async () => {
      const existing = [makeRow('r1', '2020年', '出会い')];
      const onChange = vi.fn();
      render(<TurningPointsEditor value={existing} onChange={onChange} />);
      await userEvent.click(screen.getByRole('button', { name: /ターニングポイントを追加/ }));
      const [newRows] = onChange.mock.calls[0];
      expect(newRows).toHaveLength(2);
      expect(newRows[0]).toMatchObject({ id: 'r1', at: '2020年', note: '出会い' });
    });
  });

  describe('削除', () => {
    it('削除ボタンをクリックすると該当行が削除される', async () => {
      const rows = [makeRow('r1', '2020年', '出会い'), makeRow('r2', '2022年', '別れ')];
      const onChange = vi.fn();
      render(<TurningPointsEditor value={rows} onChange={onChange} />);
      const deleteButtons = screen.getAllByRole('button', { name: 'このターニングポイントを削除' });
      await userEvent.click(deleteButtons[0]);
      expect(onChange).toHaveBeenCalledWith([makeRow('r2', '2022年', '別れ')]);
    });
  });
});
