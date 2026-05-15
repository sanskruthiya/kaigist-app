import type { Locale } from '$lib/i18n';
import type { Persona } from '$lib/types/persona';
import type { Utterance, DiscussionFormat } from '$lib/types/session';
import { PROMPT_TEMPLATES } from './templates';

function formatPersonaNames(personas: Persona[]): string {
	return personas.map((p) => p.name).join('、');
}

function formatFullHistory(
	utterances: Utterance[],
	personas: Persona[]
): string {
	const personaMap = new Map(personas.map((p) => [p.id, p.name]));
	return utterances
		.map((u) => {
			if (u.speakerPersonaId === '__facilitator__') {
				return `[R${u.round}] 🎙 ファシリテーター: ${u.content}`;
			}
			const name = personaMap.get(u.speakerPersonaId) ?? u.speakerPersonaId;
			return `[R${u.round}] ${name}: ${u.content}`;
		})
		.join('\n');
}

function getNotesStructure(format: DiscussionFormat, locale: Locale): string {
	return PROMPT_TEMPLATES.meetingNotes[locale].structures[format];
}

export function buildMeetingNotesPrompt(opts: {
	theme: string;
	format: DiscussionFormat;
	personas: Persona[];
	utterances: Utterance[];
	locale: Locale;
}): string {
	const t = PROMPT_TEMPLATES.meetingNotes[opts.locale];
	const lang = PROMPT_TEMPLATES.languageDirective[opts.locale];
	const participants = formatPersonaNames(opts.personas);
	const history = formatFullHistory(opts.utterances, opts.personas);
	const structure = getNotesStructure(opts.format, opts.locale);

	if (opts.locale === 'ja') {
		return `${lang}

${t.instruction}

テーマ: ${opts.theme}
参加者: ${participants}

議論履歴:
${history}

${structure}

${t.note}`;
	}

	return `${lang}

${t.instruction}

Theme: ${opts.theme}
Participants: ${participants}

Discussion log:
${history}

${structure}

${t.note}`;
}
