/**
 * インタビューセッション終了時の一括抽出 API ルート
 *
 * POST /api/interview-extract
 *
 * リクエストボディ:
 *   {
 *     chatHistory: Array<{role: 'user' | 'assistant', content: string}>,
 *     existingPersonNames: string[],
 *     apiKey: string,
 *     model: string
 *   }
 *
 * レスポンス:
 *   200: LlmExtractionResult（persons / relationships の配列）
 *   400: バリデーションエラー
 *   500: LLM呼び出しエラー
 *
 * インタビューのチャット全履歴を「インタビューの記録」として LLM に渡し、
 * 既存の LlmExtractionResultSchema を使って構造化抽出を行う。
 * /api/extract-relationships と同じ generateObject + jsonSchema パターンを踏襲する。
 */

import { NextResponse } from 'next/server';
import { generateObject, jsonSchema } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import {
  LlmExtractionResultSchema,
  getLlmExtractionJsonSchema,
} from '@/lib/llm-extraction-schema';

/** chatHistory の最大件数 */
const MAX_CHAT_HISTORY = 200;

/** existingPersonNames の最大件数 */
const MAX_EXISTING_PERSON_NAMES = 200;

/** existingEpisodeTitles の最大件数 */
const MAX_EXISTING_EPISODE_TITLES = 200;

/** メッセージ本文の最大文字数 */
const MAX_MESSAGE_LENGTH = 10000;

/** 人物名・エピソードタイトル要素ごとの最大文字数 */
const MAX_PERSON_NAME_LENGTH = 200;

/** generateObject のタイムアウト（ミリ秒） */
const GENERATE_OBJECT_TIMEOUT_MS = 60000;

/** チャットメッセージのスキーマ */
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(MAX_MESSAGE_LENGTH),
});

/** リクエストボディのバリデーションスキーマ */
const RequestBodySchema = z.object({
  /** インタビューのチャット履歴（最低1件必要） */
  chatHistory: z.array(ChatMessageSchema).min(1).max(MAX_CHAT_HISTORY),
  /** 既存の人物名リスト（重複登録防止のためにプロンプトに渡す） */
  existingPersonNames: z.array(z.string().max(MAX_PERSON_NAME_LENGTH)).max(MAX_EXISTING_PERSON_NAMES),
  /** 既存のエピソードタイトルリスト（重複探索抑制のためプロンプトに渡す） */
  existingEpisodeTitles: z.array(z.string().max(MAX_PERSON_NAME_LENGTH)).max(MAX_EXISTING_EPISODE_TITLES).optional().default([]),
  /** OpenRouter APIキー */
  apiKey: z.string().min(1),
  /** 使用するモデル（OpenRouter モデル ID 形式） */
  model: z.string().min(1),
});

/**
 * プロンプトインジェクション対策のため人物名をサニタイズする
 *
 * @param name - サニタイズ対象の人物名
 * @returns サニタイズ後の人物名
 */
function sanitizePersonName(name: string): string {
  return name
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[#\-`*_[\]()!\\'"/]/g, '')
    .replace(/\p{C}/gu, '') // Unicodeカテゴリ「制御文字」を除去
    .trim();
}

/**
 * チャット履歴と既存人物名から LLM に渡すプロンプトを構築する
 *
 * @param chatHistory - インタビューのチャット履歴
 * @param existingPersonNames - 既存の人物名リスト（サニタイズ前）
 * @param existingEpisodeTitles - 既存のエピソードタイトルリスト（サニタイズ前）
 * @returns プロンプト文字列
 */
function buildPrompt(
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  existingPersonNames: string[],
  existingEpisodeTitles: string[],
): string {
  const sanitizedNames = existingPersonNames
    .map(sanitizePersonName)
    .filter((n) => n.length > 0);

  const sanitizedEpisodeTitles = existingEpisodeTitles
    .map(sanitizePersonName)
    .filter((t) => t.length > 0);

  const existingNamesSection =
    sanitizedNames.length > 0
      ? `\n\n## 既存の人物（相関図に登録済み）\n以下の人物はすでに相関図に登録されています。インタビュー記録にこれらの人物が登場する場合は、必ず同じ名前を使用してください：\n${sanitizedNames.map((n) => `- ${n}`).join('\n')}`
      : '';

  const existingEpisodesSection =
    sanitizedEpisodeTitles.length > 0
      ? `\n\n## 既存のエピソード（相関図に登録済み）\n以下のエピソードはすでに相関図に登録されています。重複するエピソードは追加しないでください：\n${sanitizedEpisodeTitles.map((t) => `- ${t}`).join('\n')}`
      : '';

  // チャット履歴を読みやすい形式に変換
  const historyText = chatHistory
    .map((msg) => {
      const prefix = msg.role === 'user' ? 'ユーザー' : 'インタビュアー';
      return `${prefix}: ${msg.content}`;
    })
    .join('\n');

  return `あなたはテキストから人物（またはアイテム）間の関係を抽出するアシスタントです。

以下はインタビューの記録です。この会話から登場する人物・物とそれらの間の関係、および複数人物が関与する出来事（エピソード）を構造化されたJSONとして抽出してください。${existingNamesSection}${existingEpisodesSection}

## 注意事項
- インタビュー記録に明示的に記述されている情報のみを抽出してください。推測や補完は行わないでください。
- affection は -1.0（敵意）〜 1.0（好意）のスケールです。
- closeness, trust, tension, secrecy は 0.0〜1.0 のスケールです。
- 情報が不明な場合は null を使用してください。
- type は関係カテゴリを表す短いラベル（1〜3語）で記述してください（例: "友人", "嫌い", "親子"）。文全体ではなくキーワードのみ。人物名は含めないでください。
- label は type より具体的な表現が必要な場合のみ設定してください（1〜3語の短いラベル）。type と同じ内容になる場合は null を設定してください。
- tags には関係を端的に表すラベルを含めてください（例: "親友", "ライバル", "上司部下"）。
- symmetric は、関係が対称・無向の場合（例: 友人、同僚、家族）に true にしてください。
- turningPoints は常に空配列 [] を設定してください（出来事は episodes に抽出してください）。
- episodes には、インタビュー中でユーザーが語った複数人物が関与する「出来事・場面・イベント」を抽出してください（例: "初めての出会い", "卒業式", "告白"）。出来事がない場合は空配列 [] にしてください。
- episodes の participantNames は、その出来事に関わった人物の名前配列で、必ず persons に列挙した人物名と一致させてください。
- episodes.occurredAt は発生時点の自由文字列（"第3話", "2024年春", "2020-04-01" など）。不明な場合は null にしてください。

## インタビューの記録
${historyText}`;
}

/**
 * POST /api/interview-extract
 * インタビューのチャット履歴から人物・関係を抽出して返す。
 */
export async function POST(request: Request): Promise<NextResponse> {
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

  const { chatHistory, existingPersonNames, existingEpisodeTitles, apiKey, model } = parsed.data;

  try {
    const openrouter = createOpenRouter({ apiKey });
    const prompt = buildPrompt(chatHistory, existingPersonNames, existingEpisodeTitles);

    const rawSchema = getLlmExtractionJsonSchema();
    const schema = jsonSchema<ReturnType<typeof LlmExtractionResultSchema.parse>>(rawSchema, {
      validate: (value) => {
        const result = LlmExtractionResultSchema.safeParse(value);
        if (result.success) return { success: true, value: result.data };
        return { success: false, error: result.error };
      },
    });

    // タイムアウト用の AbortController を設定する
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), GENERATE_OBJECT_TIMEOUT_MS);

    try {
      const { object } = await generateObject({
        model: openrouter.chat(model),
        schema,
        prompt,
        abortSignal: abortController.signal,
      });
      clearTimeout(timeoutId);
      return NextResponse.json(object, { status: 200 });
    } catch (innerError) {
      clearTimeout(timeoutId);
      if (innerError instanceof Error && innerError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'タイムアウトが発生しました。再試行してください。' },
          { status: 504 }
        );
      }
      throw innerError;
    }
  } catch (error) {
    // センシティブな情報（APIキー等）がログに出力されないよう、エラーメッセージのみ記録する
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[interview-extract] LLM呼び出しエラー:', errorMessage);
    return NextResponse.json(
      { error: 'インタビュー内容の抽出に失敗しました。' },
      { status: 500 }
    );
  }
}
