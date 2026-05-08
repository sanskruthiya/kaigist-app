import type { Locale } from '$lib/i18n';
import type { Persona } from '$lib/types/persona';
import { assignColor, generateId } from '$lib/types/persona';

function getLanguageDirective(locale: Locale): string {
	return locale === 'ja'
		? 'すべての出力は日本語で行うこと。'
		: 'All output must be in English.';
}

export function buildPersonaProposalPrompt(
	theme: string,
	supplement: string,
	count: number,
	locale: Locale
): string {
	const langDirective = getLanguageDirective(locale);

	if (locale === 'ja') {
		return `${langDirective}

あなたは議論シミュレーターのペルソナ設計者です。
以下のテーマについて議論する架空のペルソナを${count}名提案してください。

テーマ: ${theme}
${supplement ? `補足: ${supplement}` : ''}

要件:
- 多様な視点（賛成・反対・中立など）を含めること
- 各ペルソナに明確な専門性と立場を設定すること
- 年齢層・性格（MBTI等を参考に）を含めること
- 必ず以下のJSON配列のみを出力し、それ以外のテキストは一切含めないこと

出力形式:
[
  {
    "name": "名前",
    "ageGroup": "年齢層（例: 30代）",
    "expertise": "専門分野",
    "stance": "立場・スタンス",
    "personality": "性格（MBTI等を参考に簡潔に）"
  }
]`;
	}

	return `${langDirective}

You are a persona designer for a discussion simulator.
Propose ${count} fictional personas to discuss the following theme.

Theme: ${theme}
${supplement ? `Context: ${supplement}` : ''}

Requirements:
- Include diverse perspectives (pro, con, neutral, etc.)
- Give each persona a clear expertise and stance
- Include age group and personality (reference MBTI etc.)
- Output ONLY the following JSON array with no additional text

Output format:
[
  {
    "name": "Full Name",
    "ageGroup": "Age group (e.g. 30s)",
    "expertise": "Area of expertise",
    "stance": "Stance/position",
    "personality": "Personality (brief, referencing MBTI etc.)"
  }
]`;
}

export function parsePersonaResponse(raw: string): Persona[] {
	if (!raw || !raw.trim()) {
		throw new Error('Empty response from LLM');
	}

	// Strip markdown code blocks if present
	let cleaned = raw.trim();
	const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (codeBlockMatch) {
		cleaned = codeBlockMatch[1].trim();
	}

	const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
	if (!jsonMatch) {
		const preview = raw.slice(0, 200).replace(/\n/g, '\\n');
		throw new Error(`No JSON array found in response: "${preview}"`);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonMatch[0]);
	} catch (parseErr) {
		const preview = jsonMatch[0].slice(0, 200).replace(/\n/g, '\\n');
		throw new Error(`Invalid JSON in response: "${preview}"`, { cause: parseErr });
	}

	if (!Array.isArray(parsed)) {
		throw new Error('Response is not an array');
	}

	if (parsed.length === 0) {
		throw new Error('Response array is empty');
	}

	return parsed.map((p: Record<string, string>, i: number) => ({
		id: generateId(),
		name: p.name ?? `Persona ${i + 1}`,
		ageGroup: p.ageGroup ?? '',
		expertise: p.expertise ?? '',
		stance: p.stance ?? '',
		personality: p.personality ?? '',
		color: assignColor(i)
	}));
}
