import type { Locale } from '$lib/i18n';
import type { Persona } from '$lib/types/persona';
import type { Utterance, DiscussionFormat } from '$lib/types/session';
import { PROMPT_TEMPLATES } from './templates';

const MAX_HISTORY_UTTERANCES = 20;
const MAX_UTTERANCE_CHARS = 800;
const TRUNCATE_LIMIT = 600;

function getFormatDirective(format: DiscussionFormat, locale: Locale): string {
	return PROMPT_TEMPLATES.discussion[locale].formatDirectives[format];
}

function formatPersonas(personas: Persona[]): string {
	return personas
		.map(
			(p) =>
				`- ${p.name}（${p.ageGroup}）: ${p.expertise} / ${p.stance} / ${p.personality}`
		)
		.join('\n');
}

function formatHistory(
	utterances: Utterance[],
	personas: Persona[]
): string {
	const personaMap = new Map(personas.map((p) => [p.id, p.name]));
	const recent = utterances.slice(-MAX_HISTORY_UTTERANCES);
	return recent
		.map((u) => {
			const name = personaMap.get(u.speakerPersonaId) ?? u.speakerPersonaId;
			const text =
				u.content.length > MAX_UTTERANCE_CHARS
					? u.content.slice(0, MAX_UTTERANCE_CHARS) + '…'
					: u.content;
			return `[R${u.round}] ${name}: ${text}`;
		})
		.join('\n');
}

function getAlreadySpoken(
	utterances: Utterance[],
	currentRound: number,
	personas: Persona[]
): string[] {
	const personaMap = new Map(personas.map((p) => [p.id, p.name]));
	return utterances
		.filter((u) => u.round === currentRound)
		.map((u) => personaMap.get(u.speakerPersonaId) ?? '');
}

export function buildDiscussionPrompt(opts: {
	theme: string;
	supplement: string;
	direction: string;
	format: DiscussionFormat;
	personas: Persona[];
	utterances: Utterance[];
	currentRound: number;
	maxRounds: number;
	facilitatorComment: string;
	locale: Locale;
}): string {
	const t = PROMPT_TEMPLATES.discussion[opts.locale];
	const lang = PROMPT_TEMPLATES.languageDirective[opts.locale];
	const personaList = formatPersonas(opts.personas);
	const history = formatHistory(opts.utterances, opts.personas);
	const alreadySpoken = getAlreadySpoken(
		opts.utterances,
		opts.currentRound,
		opts.personas
	);

	const spokenNote =
		alreadySpoken.length > 0
			? `\n既にこのラウンドで発言済み: ${alreadySpoken.join(', ')}\nまだ発言していないペルソナから選んでください。`
			: '';

	const facilitator = opts.facilitatorComment
		? `\nファシリテーターの指示: ${opts.facilitatorComment}`
		: '';

	const formatDirective = getFormatDirective(opts.format, opts.locale);

	// Round2まで補足情報を含める
	const supplementInfo = opts.currentRound <= 2 && opts.supplement
		? `\n補足・背景情報:\n${opts.supplement}\n`
		: '';

	const requirements = t.requirements.map((r) => `- ${r}`).join('\n');

	if (opts.locale === 'ja') {
		return `${lang}

${t.systemRole}

テーマ: ${opts.theme}${supplementInfo}
${opts.direction ? `方向性: ${opts.direction}` : ''}${formatDirective}

ペルソナ一覧:
${personaList}

現在のラウンド: ${opts.currentRound}/${opts.maxRounds}
${spokenNote}
${facilitator}

これまでの議論:
${history || '（まだ発言なし）'}

要件:
${requirements}

出力形式:
${t.outputFormat}`;
	}

	return `${lang}

${t.systemRole}

Theme: ${opts.theme}${supplementInfo}
${opts.direction ? `Direction: ${opts.direction}` : ''}${formatDirective}

Personas:
${personaList}

Current round: ${opts.currentRound}/${opts.maxRounds}
${spokenNote}
${facilitator}

Discussion so far:
${history || '(No statements yet)'}

Requirements:
${requirements}

Output format:
${t.outputFormat}`;
}

export interface ParsedUtterance {
	speaker: string;
	content: string;
}

function tryRecoverTruncatedJson(text: string): ParsedUtterance | null {
	// Extract speaker from "speaker": "..." pattern
	const speakerMatch = text.match(/"speaker"\s*:\s*"([^"]+)"/);
	if (!speakerMatch) return null;

	// Extract content - may be truncated (missing closing quote)
	const contentMatch = text.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)(")?/);
	if (!contentMatch) return null;

	const speaker = speakerMatch[1];
	let content = contentMatch[1];

	// Unescape JSON string escapes
	try {
		content = JSON.parse(`"${content}"`);
	} catch {
		// Use raw content if unescape fails
	}

	if (!speaker || !content || content.length < 10) return null;

	console.warn('[parseDiscussion] Recovered truncated JSON:', { speaker, contentLen: content.length });
	return {
		speaker,
		content: truncateUtterance(content)
	};
}

export function parseDiscussionResponse(raw: string): ParsedUtterance {
	if (!raw || !raw.trim()) {
		throw new Error('Empty response from LLM');
	}

	// Strip markdown code blocks if present
	let cleaned = raw.trim();
	const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (codeBlockMatch) {
		cleaned = codeBlockMatch[1].trim();
	}

	const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

	// Fallback: try to recover truncated JSON (e.g. missing closing " and })
	if (!jsonMatch) {
		const recovered = tryRecoverTruncatedJson(cleaned);
		if (recovered) return recovered;
		const preview = raw.slice(0, 200).replace(/\n/g, '\\n');
		throw new Error(`No JSON object found in response: "${preview}"`);
	}

	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(jsonMatch[0]);
	} catch {
		// Try recovering from malformed JSON (truncated mid-value)
		const recovered = tryRecoverTruncatedJson(jsonMatch[0]);
		if (recovered) return recovered;
		const preview = jsonMatch[0].slice(0, 200).replace(/\n/g, '\\n');
		throw new Error(`Invalid JSON in response: "${preview}"`);
	}

	if (!parsed.speaker || !parsed.content) {
		throw new Error(`Missing speaker or content: ${JSON.stringify(parsed).slice(0, 200)}`);
	}

	return {
		speaker: String(parsed.speaker),
		content: truncateUtterance(String(parsed.content))
	};
}

export function truncateUtterance(text: string): string {
	if (text.length <= TRUNCATE_LIMIT) return text;

	const cutPoint = text.slice(0, TRUNCATE_LIMIT);
	const lastPunctuation = Math.max(
		cutPoint.lastIndexOf('。'),
		cutPoint.lastIndexOf('！'),
		cutPoint.lastIndexOf('？'),
		cutPoint.lastIndexOf('.'),
		cutPoint.lastIndexOf('!'),
		cutPoint.lastIndexOf('?')
	);

	if (lastPunctuation > TRUNCATE_LIMIT * 0.5) {
		return text.slice(0, lastPunctuation + 1) + '…';
	}
	return cutPoint + '…';
}
