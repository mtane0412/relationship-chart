/**
 * LLM テキスト→関係抽出 API ルート
 *
 * POST /api/extract-relationships
 *
 * リクエストボディ:
 *   { text: string, existingPersonNames: string[], apiKey: string, model: string }
 *
 * レスポンス:
 *   200: LlmExtractionResult（persons / relationships の配列）
 *   400: バリデーションエラー（テキスト未入力・長すぎ・APIキー未指定など）
 *   500: LLM呼び出しエラー
 *
 * Vercel AI SDK の generateObject + jsonSchema ヘルパーを使用し、
 * zod v4 との互換性問題を回避している。
 * （zod v4 のスキーマを直接 generateObject に渡せないため、
 *   z.toJSONSchema() で JSON Schema に変換してから渡す）
 *
 * APIキーはクライアントから受け取り、サーバー側では永続化しない。
 * OpenRouter 経由で各プロバイダのモデルにアクセスする。
 */

import { NextResponse } from 'next/server';
import { generateObject, jsonSchema } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { z } from 'zod';
import {
  LlmExtractionResultSchema,
  getLlmExtractionJsonSchema,
} from '@/lib/llm-extraction-schema';

/** リクエストボディの最大テキスト長 */
const MAX_TEXT_LENGTH = 10000;

/** existingPersonNames の最大件数（プロンプト長制限のため） */
const MAX_EXISTING_PERSON_NAMES = 200;

/** existingEpisodeTitles の最大件数 */
const MAX_EXISTING_EPISODE_TITLES = 200;

/** リクエストボディのバリデーションスキーマ */
const RequestBodySchema = z.object({
  /** 関係を抽出するテキスト（1〜10000文字） */
  text: z.string().min(1).max(MAX_TEXT_LENGTH),
  /** 既存の人物名リスト（LLM に渡してマッチングを促す。最大 200 件） */
  existingPersonNames: z.array(z.string()).max(MAX_EXISTING_PERSON_NAMES),
  /** 既存のエピソードタイトルリスト（重複探索抑制のためプロンプトに注入する） */
  existingEpisodeTitles: z.array(z.string()).max(MAX_EXISTING_EPISODE_TITLES).optional().default([]),
  /** OpenRouter APIキー（クライアントの設定から渡す） */
  apiKey: z.string().min(1),
  /** 使用するモデル（OpenRouter モデル ID 形式: "provider/model-name"） */
  model: z.string().min(1),
});

/**
 * プロンプトインジェクション対策のため人物名をサニタイズする
 * - 制御文字・改行を除去
 * - Markdown 特殊記号を除去
 * @param name - サニタイズ対象の人物名
 */
function sanitizePersonName(name: string): string {
  return name
    .replace(/[\r\n\t]/g, ' ') // 改行・タブを空白に
    .replace(/[#\-`*_[\]()!]/g, '') // Markdown 特殊記号を除去
    .trim();
}

/**
 * LLM に渡すプロンプトを構築する
 * @param text - ユーザーが入力したテキスト
 * @param existingPersonNames - 既存の人物名リスト（サニタイズ済み）
 * @param existingEpisodeTitles - 既存のエピソードタイトルリスト（サニタイズ済み）
 */
function buildPrompt(text: string, existingPersonNames: string[], existingEpisodeTitles: string[]): string {
  const sanitizedNames = existingPersonNames
    .map(sanitizePersonName)
    .filter((n) => n.length > 0);

  const sanitizedEpisodeTitles = existingEpisodeTitles
    .map(sanitizePersonName)
    .filter((t) => t.length > 0);

  const existingNamesSection =
    sanitizedNames.length > 0
      ? `\n\n## 既存の人物（相関図に登録済み）\n以下の人物はすでに相関図に登録されています。テキスト中にこれらの人物が登場する場合は、必ず同じ名前を使用してください：\n${sanitizedNames.map((n) => `- ${n}`).join('\n')}`
      : '';

  const existingEpisodesSection =
    sanitizedEpisodeTitles.length > 0
      ? `\n\n## 既存のエピソード（相関図に登録済み）\n以下のエピソードはすでに相関図に登録されています。重複するエピソードは追加しないでください：\n${sanitizedEpisodeTitles.map((t) => `- ${t}`).join('\n')}`
      : '';

  return `あなたはテキストから人物（またはアイテム）間の関係を抽出するアシスタントです。

与えられたテキストを分析し、登場する人物・物とそれらの間の関係、および複数人物が関与する出来事（エピソード）を構造化されたJSONとして出力してください。${existingNamesSection}${existingEpisodesSection}

## 注意事項
- テキストに明示的に記述されている関係のみを抽出してください。推測や補完は行わないでください。
- affection は -1.0（敵意）〜 1.0（好意）のスケールです。
- closeness, trust, tension, secrecy は 0.0〜1.0 のスケールです。
- 情報が不明な場合は null を使用してください。
- type は関係カテゴリを表す短いラベル（1〜3語）で記述してください（例: "友人", "嫌い", "親子"）。文全体ではなくキーワードのみ。人物名は含めないでください。
- label は type より具体的な表現が必要な場合のみ設定してください（1〜3語の短いラベル。人物名は含めない）。例: type="親子" の場合に label="実の親子" のように限定したいとき。type と同じ内容になる場合は null を設定してください。
- tags には関係を端的に表すラベルを含めてください（例: "親友", "ライバル", "上司部下"）。
- symmetric は、関係が対称・無向の場合（例: 友人、同僚、家族）に true にしてください。片想い・上司→部下など非対称・有向の関係では false にしてください。
- turningPoints は常に空配列 [] を設定してください（出来事は episodes に抽出してください）。
- episodes には、テキスト中で複数人物が関与する「出来事・場面・イベント」を抽出してください（例: "初めての出会い", "卒業式", "決戦"）。出来事がない場合は空配列 [] にしてください。
- episodes の participantNames は、その出来事に関わった人物の名前配列で、必ず persons に列挙した人物名と一致させてください。
- episodes.occurredAt は発生時点の自由文字列（"第3話", "2024年春", "2020-04-01" など）。テキストに記述がない場合は null にしてください。

## 解析対象テキスト
${text}`;
}

/**
 * POST /api/extract-relationships
 * テキストから人物・関係を抽出して返す。
 */
export async function POST(request: Request): Promise<NextResponse> {
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

  const { text, existingPersonNames, existingEpisodeTitles, apiKey, model } = parsed.data;

  try {
    // OpenRouter プロバイダを初期化（クライアントから受け取った APIキーを使用）
    const openrouter = createOpenRouter({ apiKey });
    const prompt = buildPrompt(text, existingPersonNames, existingEpisodeTitles);

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
      model: openrouter.chat(model),
      schema,
      prompt,
    });

    return NextResponse.json(object, { status: 200 });
  } catch (error) {
    // 内部エラーはサーバーログに記録し、クライアントには汎用メッセージのみ返す
    console.error('[extract-relationships] LLM呼び出しエラー:', error);
    return NextResponse.json({ error: '関係の抽出に失敗しました。' }, { status: 500 });
  }
}
