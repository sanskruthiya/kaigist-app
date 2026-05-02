import type { Locale } from '$lib/i18n';
import type { Persona } from '$lib/types/persona';
import type { Utterance } from '$lib/types/session';

function getLanguageDirective(locale: Locale): string {
	return locale === 'ja'
		? 'すべての出力は日本語で行うこと。'
		: 'All output must be in English.';
}

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

export function buildMeetingNotesPrompt(opts: {
	theme: string;
	personas: Persona[];
	utterances: Utterance[];
	locale: Locale;
}): string {
	const lang = getLanguageDirective(opts.locale);
	const participants = formatPersonaNames(opts.personas);
	const history = formatFullHistory(opts.utterances, opts.personas);

	if (opts.locale === 'ja') {
		return `${lang}

以下の議論内容から、構造化された議事メモを作成してください。

テーマ: ${opts.theme}
参加者: ${participants}

議論履歴:
${history}

以下の構成でMarkdown形式の議事メモを作成してください:
1. 議論の要約（3〜5文）
2. 主要な論点
3. 合意事項
4. 残された論点

注意: 議事メモ内に個々のペルソナの名前は記載せず、意見や論点を中心にまとめてください。
Markdown形式のみを出力し、それ以外のテキストは含めないでください。`;
	}

	return `${lang}

Create structured meeting notes from the following discussion.

Theme: ${opts.theme}
Participants: ${participants}

Discussion log:
${history}

Create meeting notes in Markdown format with the following sections:
1. Summary (3-5 sentences)
2. Key Topics
3. Points of Agreement
4. Remaining Issues

Note: Do not include individual persona names in the notes. Focus on summarizing opinions and key points.
Output ONLY the Markdown content with no additional text.`;
}
