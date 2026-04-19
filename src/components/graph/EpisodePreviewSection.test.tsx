/**
 * EpisodePreviewSection コンポーネントのテスト
 *
 * エピソードプレビューセクションのUI表示を検証する。
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EpisodePreviewSection } from './EpisodePreviewSection';
import type { LlmEpisode } from '@/lib/llm-extraction-schema';

describe('EpisodePreviewSection', () => {
  it('エピソードが空のとき「なし」と表示されること', () => {
    render(<EpisodePreviewSection episodes={[]} />);
    expect(screen.getByText(/なし/)).toBeInTheDocument();
    expect(screen.getByText(/エピソード.*0.*件/)).toBeInTheDocument();
  });

  it('エピソードタイトルが表示されること', () => {
    const episodes: LlmEpisode[] = [
      { title: '初めての出会い', description: null, occurredAt: null, participantNames: ['田中太郎', '山田花子'] },
    ];
    render(<EpisodePreviewSection episodes={episodes} />);
    expect(screen.getByText('初めての出会い')).toBeInTheDocument();
  });

  it('occurredAt が表示されること', () => {
    const episodes: LlmEpisode[] = [
      { title: '卒業式', description: null, occurredAt: '2023年春', participantNames: ['田中太郎'] },
    ];
    render(<EpisodePreviewSection episodes={episodes} />);
    expect(screen.getByText('2023年春')).toBeInTheDocument();
  });

  it('参加者名が表示されること', () => {
    const episodes: LlmEpisode[] = [
      { title: '告白', description: null, occurredAt: null, participantNames: ['田中太郎', '山田花子'] },
    ];
    render(<EpisodePreviewSection episodes={episodes} />);
    expect(screen.getByText(/田中太郎/)).toBeInTheDocument();
    expect(screen.getByText(/山田花子/)).toBeInTheDocument();
  });

  it('複数エピソードの件数が表示されること', () => {
    const episodes: LlmEpisode[] = [
      { title: 'A', description: null, occurredAt: null, participantNames: [] },
      { title: 'B', description: null, occurredAt: null, participantNames: [] },
      { title: 'C', description: null, occurredAt: null, participantNames: [] },
    ];
    render(<EpisodePreviewSection episodes={episodes} />);
    expect(screen.getByText(/エピソード.*3.*件/)).toBeInTheDocument();
  });
});
