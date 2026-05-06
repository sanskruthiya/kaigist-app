import type { Locale } from '$lib/i18n';
import type { Persona } from '$lib/types/persona';
import type { Utterance, DiscussionFormat } from '$lib/types/session';

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

function getNotesStructure(format: DiscussionFormat, locale: Locale): string {
	if (locale === 'ja') {
		switch (format) {
			case 'ranking':
				return `以下の構成でMarkdown形式の議事メモを作成してください:
1. 議論の要約（3〜5文）
2. 主要な論点
3. 最終的な順位・評価（議論で決定された優先順位や評価を明確に記載）
4. 順位付けの根拠（各項目の評価理由）
5. 残された論点`;
			case 'ideation':
				return `以下の構成でMarkdown形式の議事メモを作成してください:
1. 議論の要約（3〜5文）
2. 提案されたアイデア一覧（箇条書きで、各アイデアを簡潔に記載）
3. 特に注目すべきアイデア（独創性や実現時のインパクトが高いもの）
4. アイデアの組み合わせ・発展案
5. 今後の検討事項`;
			case 'free':
			default:
				return `以下の構成でMarkdown形式の議事メモを作成してください:
1. 議論の要約（3〜5文）
2. 主要な論点
3. 合意事項
4. 残された論点`;
		}
	} else {
		switch (format) {
			case 'ranking':
				return `Create meeting notes in Markdown format with the following sections:
1. Summary (3-5 sentences)
2. Key Topics
3. Final Rankings/Evaluations (clearly state the priorities or rankings decided in the discussion)
4. Rationale for Rankings (reasons for each evaluation)
5. Remaining Issues`;
			case 'ideation':
				return `Create meeting notes in Markdown format with the following sections:
1. Summary (3-5 sentences)
2. List of Proposed Ideas (bullet points, briefly describe each idea)
3. Noteworthy Ideas (those with high originality or potential impact)
4. Combined/Evolved Ideas
5. Future Considerations`;
			case 'free':
			default:
				return `Create meeting notes in Markdown format with the following sections:
1. Summary (3-5 sentences)
2. Key Topics
3. Points of Agreement
4. Remaining Issues`;
		}
	}
}

export function buildMeetingNotesPrompt(opts: {
	theme: string;
	format: DiscussionFormat;
	personas: Persona[];
	utterances: Utterance[];
	locale: Locale;
}): string {
	const lang = getLanguageDirective(opts.locale);
	const participants = formatPersonaNames(opts.personas);
	const history = formatFullHistory(opts.utterances, opts.personas);
	const structure = getNotesStructure(opts.format, opts.locale);

	if (opts.locale === 'ja') {
		return `${lang}

以下の議論内容から、構造化された議事メモを作成してください。

テーマ: ${opts.theme}
参加者: ${participants}

議論履歴:
${history}

${structure}

注意: 議事メモ内に個々のペルソナの名前は記載せず、意見や論点を中心にまとめてください。
Markdown形式のみを出力し、それ以外のテキストは含めないでください。`;
	}

	return `${lang}

Create structured meeting notes from the following discussion.

Theme: ${opts.theme}
Participants: ${participants}

Discussion log:
${history}

${structure}

Note: Do not include individual persona names in the notes. Focus on summarizing opinions and key points.
Output ONLY the Markdown content with no additional text.`;
}
