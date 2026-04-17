/**
 * LLM テキスト→関係抽出 API ルート
 *
 * POST /api/extract-relationships
 *
 * リクエストボディ:
 *   { text: string, existingPersonNames: string[] }
 *
 * レスポンス:
 *   200: LlmExtractionResult（persons / relationships の配列）
 *   400: バリデーションエラー
 *   500: APIキー未設定またはLLM呼び出しエラー
 *
 * Vercel AI SDK の generateObject + jsonSchema ヘルパーを使用し、
 * zod v4 との互換性問題を回避している。
 * （zod v4 のスキーマを直接 generateObject に渡せないため、
 *   z.toJSONSchema() で JSON Schema に変換してから渡す）
 */

import { NextResponse } from 'next/server';
import { generateObject, jsonSchema } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  LlmExtractionResultSchema,
  getLlmExtractionJsonSchema,
} from '@/lib/llm-extraction-schema';

/** リクエストボディの最大テキスト長 */
const MAX_TEXT_LENGTH = 10000;

/** リクエストボディのバリデーションスキーマ */
const RequestBodySchema = z.object({
  /** 関係を抽出するテキスト（1〜10000文字） */
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  /** 既存の人物名リスト（LLM に渡してマッチングを促す） */
  existingPersonNames: z.array(z.string()),
});

/**
 * LLM に渡すプロンプトを構築する
 * @param text - ユーザーが入力したテキスト
 * @param existingPersonNames - 既存の人物名リスト
 */
function buildPrompt(text: string, existingPersonNames: string[]): string {
  const existingNamesSection =
    existingPersonNames.length > 0
      ? `\n\n## 既存の人物（相関図に登録済み）\n以下の人物はすでに相関図に登録されています。テキスト中にこれらの人物が登場する場合は、必ず同じ名前を使用してください：\n${existingPersonNames.map((n) => `- ${n}`).join('\n')}`
      : '';

  return `あなたはテキストから人物（またはアイテム）間の関係を抽出するアシスタントです。

与えられたテキストを分析し、登場する人物・物とそれらの間の関係を構造化されたJSONとして出力してください。${existingNamesSection}

## 注意事項
- テキストに明示的に記述されている関係のみを抽出してください。推測や補完は行わないでください。
- affection は -1.0（敵意）〜 1.0（好意）のスケールです。
- closeness, trust, tension, secrecy は 0.0〜1.0 のスケールです。
- 情報が不明な場合は null を使用してください。
- tags には関係を端的に表すラベルを含めてください（例: "親友", "ライバル", "上司部下"）。
- isDirected は、関係が非対称の場合（例: 片想い、上司→部下）に true にしてください。
- turningPoints は配列で返してください。ない場合は空配列 [] にしてください。

## 解析対象テキスト
${text}`;
}

/**
 * POST /api/extract-relationships
 * テキストから人物・関係を抽出して返す。
 */
export async function POST(request: Request): Promise<NextResponse> {
  // APIキーの確認
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY が設定されていません。' },
      { status: 500 }
    );
  }

  // リクエストボディのパース
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'リクエストボディの解析に失敗しました。' }, { status: 400 });
  }

  // バリデーション
  const parsed = RequestBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'リクエストが不正です。', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { text, existingPersonNames } = parsed.data;

  try {
    const anthropic = createAnthropic();
    const prompt = buildPrompt(text, existingPersonNames);

    // zod v4 は generateObject に直接渡せないため、
    // JSON Schema に変換してから jsonSchema ヘルパーで包む
    const rawSchema = getLlmExtractionJsonSchema();
    const schema = jsonSchema<ReturnType<typeof LlmExtractionResultSchema.parse>>(rawSchema, {
      validate: (value) => {
        const result = LlmExtractionResultSchema.safeParse(value);
        if (result.success) return { success: true, value: result.data };
        return { success: false, error: result.error };
      },
    });

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema,
      prompt,
    });

    return NextResponse.json(object, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: `関係の抽出に失敗しました。${message}` },
      { status: 500 }
    );
  }
}
