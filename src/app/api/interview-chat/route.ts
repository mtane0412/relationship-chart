/**
 * AIインタビュアー ストリーミングチャット API ルート
 *
 * POST /api/interview-chat
 *
 * リクエストボディ:
 *   {
 *     messages: Array<{role: 'user' | 'assistant', content: string}>,
 *     existingPersonNames: string[],
 *     existingRelationshipSummaries: string[],
 *     apiKey: string,
 *     model: string
 *   }
 *
 * レスポンス:
 *   200: text/event-stream（ストリーミングチャット応答）
 *   400: バリデーションエラー
 *   500: LLM呼び出しエラー
 *
 * Vercel AI SDK の streamText + toTextStreamResponse を使用する。
 * APIキーはクライアントから受け取り、サーバー側では永続化しない。
 * OpenRouter 経由で各プロバイダのモデルにアクセスする。
 */

import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import { buildInterviewSystemPrompt } from '@/lib/interview-prompt';

/** messages の最大件数（トークン制限対策） */
const MAX_MESSAGES = 100;

/** existingPersonNames の最大件数 */
const MAX_EXISTING_PERSON_NAMES = 200;

/** existingRelationshipSummaries の最大件数 */
const MAX_EXISTING_RELATIONSHIP_SUMMARIES = 200;

/** メッセージ本文の最大文字数 */
const MAX_CONTENT_LENGTH = 10000;

/** 人物名・関係サマリの要素ごとの最大文字数 */
const MAX_NAME_LENGTH = 200;

/** チャットメッセージのスキーマ */
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
});

/** リクエストボディのバリデーションスキーマ */
const RequestBodySchema = z.object({
  /** チャットメッセージ履歴（最低1件必要） */
  messages: z.array(ChatMessageSchema).min(1).max(MAX_MESSAGES),
  /** 既存の人物名リスト（システムプロンプトに注入する） */
  existingPersonNames: z.array(z.string().max(MAX_NAME_LENGTH)).max(MAX_EXISTING_PERSON_NAMES),
  /** 既存の関係サマリリスト（システムプロンプトに注入する） */
  existingRelationshipSummaries: z.array(z.string().max(MAX_NAME_LENGTH)).max(MAX_EXISTING_RELATIONSHIP_SUMMARIES),
  /** OpenRouter APIキー（クライアントの設定から渡す） */
  apiKey: z.string().min(1),
  /** 使用するモデル（OpenRouter モデル ID 形式） */
  model: z.string().min(1),
});

/**
 * POST /api/interview-chat
 * AIインタビュアーとのストリーミングチャットを処理する。
 */
export async function POST(request: Request): Promise<Response> {
  // リクエストボディのパース
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'リクエストボディの解析に失敗しました。' },
      { status: 400 }
    );
  }

  // バリデーション
  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'リクエストが不正です。', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { messages, existingPersonNames, existingRelationshipSummaries, apiKey, model } = parsed.data;

  try {
    // OpenRouter プロバイダを初期化（クライアントから受け取った APIキーを使用）
    const openrouter = createOpenRouter({ apiKey });

    // AIインタビュアーのシステムプロンプトを生成
    const systemPrompt = buildInterviewSystemPrompt(
      existingPersonNames,
      existingRelationshipSummaries,
    );

    const result = streamText({
      model: openrouter.chat(model),
      system: systemPrompt,
      messages,
      onError: ({ error }) => {
        // ストリーミング中に発生したエラーをログに記録する
        const message = error instanceof Error ? error.message : String(error);
        console.error('[interview-chat] ストリーミングエラー:', message);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('[interview-chat] LLM呼び出しエラー:', error);
    return NextResponse.json(
      { error: 'チャットの処理に失敗しました。' },
      { status: 500 }
    );
  }
}
