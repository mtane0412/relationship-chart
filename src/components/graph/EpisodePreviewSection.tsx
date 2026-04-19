/**
 * エピソードプレビューセクションコンポーネント
 *
 * LLM 抽出結果のエピソード一覧を表示する共通コンポーネント。
 * ExtractionPreviewPanel と InterviewModal のプレビューから参照する。
 */

import { CalendarClock } from 'lucide-react';
import type { LlmEpisode } from '@/lib/llm-extraction-schema';

type Props = {
  /** 表示するエピソード一覧 */
  episodes: LlmEpisode[];
};

/**
 * エピソード一覧をプレビュー表示するセクション
 */
export function EpisodePreviewSection({ episodes }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock size={14} className="text-amber-600" aria-hidden />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          エピソード ({episodes.length} 件)
        </span>
      </div>
      {episodes.length === 0 ? (
        <p className="text-sm text-gray-400 ml-5">なし</p>
      ) : (
        <ul className="space-y-1">
          {episodes.map((ep, i) => (
            <li key={i} className="text-sm text-gray-700 ml-1">
              <div className="font-medium">{ep.title}</div>
              {ep.occurredAt && (
                <div className="text-xs text-gray-400">{ep.occurredAt}</div>
              )}
              {ep.participantNames.length > 0 && (
                <div className="text-xs text-amber-600">
                  参加者: {ep.participantNames.join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
