import type { Locale } from '$lib/i18n';
import type { Persona } from '$lib/types/persona';
import { assignColor, generateId } from '$lib/types/persona';
import { PROMPT_TEMPLATES } from './templates';

export function buildPersonaProposalPrompt(
	theme: string,
	supplement: string,
	count: number,
	locale: Locale
): string {
	const t = PROMPT_TEMPLATES.personaProposal[locale];
	const langDirective = PROMPT_TEMPLATES.languageDirective[locale];

	const instruction = t.instruction.replace('{count}', String(count));
	const requirements = t.requirements.map((r) => `- ${r}`).join('\n');

	const supplementLine = supplement
		? `${locale === 'ja' ? '補足' : 'Context'}: ${supplement}`
		: '';

	return `${langDirective}

${t.systemRole}
${instruction}

${locale === 'ja' ? 'テーマ' : 'Theme'}: ${theme}
${supplementLine}

${locale === 'ja' ? '要件' : 'Requirements'}:
${requirements}

${locale === 'ja' ? '出力形式' : 'Output format'}:
${t.outputFormat}`;
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
