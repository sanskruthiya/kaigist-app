import type { Locale } from '$lib/i18n';
import type { DiscussionFormat } from '$lib/types/session';

/**
 * すべてのプロンプトテンプレートを管理する定数オブジェクト
 * プロンプトの調整はこのファイルを編集することで行う
 */
export const PROMPT_TEMPLATES = {
	/** 言語指示 */
	languageDirective: {
		ja: 'すべての出力は日本語で行うこと。',
		en: 'All output must be in English.'
	} satisfies Record<Locale, string>,

	/** ペルソナ提案プロンプト */
	personaProposal: {
		ja: {
			systemRole: 'あなたは議論シミュレーターのペルソナ設計者です。',
			instruction: '以下のテーマについて議論する架空のペルソナを{count}名提案してください。',
			requirements: [
				'多様な視点（賛成・反対・中立など）を含めること',
				'各ペルソナに明確な専門性や立場を設定すること',
				'年齢層・性格（MBTI等を参考に）を含めること',
				'必ず以下のJSON配列のみを出力し、それ以外のテキストは一切含めないこと'
			],
			outputFormat: `[
  {
    "name": "名前",
    "ageGroup": "年齢層（例: 30代）",
    "expertise": "専門分野",
    "stance": "立場・スタンス",
    "personality": "性格（MBTI等を参考に簡潔に）"
  }
]`
		},
		en: {
			systemRole: 'You are a persona designer for a discussion simulator.',
			instruction: 'Propose {count} fictional personas to discuss the following theme.',
			requirements: [
				'Include diverse perspectives (pro, con, neutral, etc.)',
				'Give each persona a clear expertise or stance',
				'Include age group and personality (reference MBTI etc.)',
				'Output ONLY the following JSON array with no additional text'
			],
			outputFormat: `[
  {
    "name": "Full Name",
    "ageGroup": "Age group (e.g. 30s)",
    "expertise": "Area of expertise",
    "stance": "Stance/position",
    "personality": "Personality (brief, referencing MBTI etc.)"
  }
]`
		}
	} satisfies Record<Locale, {
		systemRole: string;
		instruction: string;
		requirements: string[];
		outputFormat: string;
	}>,

	/** 議論プロンプト */
	discussion: {
		ja: {
			systemRole: 'あなたは多様な視点を持つペルソナによる議論シミュレーターです。各ペルソナの専門性と個性を活かした発言を生成してください。',
			requirements: [
				'まだこのラウンド内及び直前で発言していないペルソナから1名を選び、そのペルソナの立場として発言を生成すること',
				'発言は100〜300字程度にすること（簡潔さと具体性のバランスを重視）',
				'直前の発言内容の繰り返しや単純な否定・同意は避け、異なる角度からの考察や新しい論点を提示すること',
				'他のペルソナの発言に対する新しい視点、具体案、または発展的な問いかけを含めること',
				'現在のラウンドが全体の前半（1〜2割）なら議論を広げ、後半（8割以降）なら議論の取りまとめやリスト化する流れを意識すること',
				'必ず以下のJSON形式のみを出力し、それ以外のテキストは含めないこと'
			],
			formatDirectives: {
				ranking: '【議論形式: 順位付け】\n- 様々な観点から議論を深めつつ、最終ラウンドでは必ず対象の優劣や優先順位を明確にすること\n- 最終ラウンドでは各ペルソナが自分の考える順位や評価を具体的に示すこと\n- 情報が不足している場合でも、自分の専門性や価値観に基づいて仮定を置き、必ず順位付けを行うこと（例：「〜と仮定すれば」「〜の観点を重視すると」）',
				ideation: '【議論形式: アイデア出し】\n- 実現可能な現実的アイデアに加えて、現在の技術的制約や社会倫理的な制約にとらわれない面白いアイデアや斬新な発想も積極的に提示すること\n- 実現可能性よりも創造性と独自性を重視すること\n- 他のペルソナのアイデアを発展させたり、組み合わせたりすることも歓迎\n- 最終ラウンドでは、提案されたアイデアについて現状（As-Is）と理想の姿（To-Be）を対比させ、差分を明確に示すこと',
				free: ''
			},
			outputFormat: `{
  "speaker": "発言者の名前",
  "content": "発言内容"
}`
		},
		en: {
			systemRole: 'You are a discussion simulator with diverse personas. Generate statements that leverage each persona\'s expertise and individuality.',
			requirements: [
				'Choose one persona who has NOT spoken in this round or immediately before, and generate their statement from that persona\'s perspective',
				'Keep the statement between 100-300 characters (balance brevity with specificity)',
				'Avoid repeating, simply negating, or merely agreeing with the previous statement; present insights from different angles or introduce new points of discussion',
				'Include new perspectives, concrete proposals, or thought-provoking questions in response to other personas\' statements',
				'If current round is in the first 10-20% of total rounds, broaden the discussion; if in the final 20%, focus on summarizing or listing key points',
				'Output ONLY the following JSON format with no additional text'
			],
			formatDirectives: {
				ranking: '【Discussion Format: Ranking】\n- Deepen the discussion from various perspectives, but in the final round, clearly assign priorities or rankings\n- In the final round, each persona should explicitly state their ranking or evaluation\n- Even if information is insufficient, make assumptions based on your expertise and values to provide rankings (e.g., "Assuming that...", "From the perspective of...")',
				ideation: '【Discussion Format: Ideation】\n- In addition to feasible and realistic ideas, actively present interesting and innovative ideas without being constrained by current technical or ethical limitations\n- Prioritize creativity and originality over feasibility\n- Feel free to develop or combine ideas from other personas\n- In the final round, contrast the current state (As-Is) with the ideal state (To-Be) for the proposed ideas, clearly showing the gap',
				free: ''
			},
			outputFormat: `{
  "speaker": "Speaker's name",
  "content": "Statement content"
}`
		}
	} satisfies Record<Locale, {
		systemRole: string;
		requirements: string[];
		formatDirectives: Record<DiscussionFormat, string>;
		outputFormat: string;
	}>,

	/** 議事メモプロンプト */
	meetingNotes: {
		ja: {
			instruction: '以下の議論内容から、構造化された議事メモを作成してください。',
			note: '注意: 議事メモ内に個々のペルソナの名前は記載せず、意見や論点を中心にまとめてください。\nMarkdown形式のみを出力し、それ以外のテキストは含めないでください。',
			structures: {
				ranking: `以下の構成でMarkdown形式の議事メモを作成してください:
1. 議論の要約（3〜5文）
2. 主要な論点
3. 最終的な評価（議論で決定された優劣または優先順位を明確に記載）
4. 評価の根拠（各項目の評価理由）
5. 残された論点`,
				ideation: `以下の構成でMarkdown形式の議事メモを作成してください:
1. 議論の要約（3〜5文）
2. 提案されたアイデア一覧（箇条書きで、各アイデアを簡潔に記載）
3. 特に注目すべきアイデア（独創性や実現時のインパクトが高いもの）
4. アイデアの組み合わせ・発展案
5. 今後の検討事項`,
				free: `以下の構成でMarkdown形式の議事メモを作成してください:
1. 議論の要約（3〜5文）
2. 主要な論点
3. 合意事項
4. 残された論点`
			}
		},
		en: {
			instruction: 'Create structured meeting notes from the following discussion.',
			note: 'Note: Do not include individual persona names in the notes. Focus on summarizing opinions and key points.\nOutput ONLY the Markdown content with no additional text.',
			structures: {
				ranking: `Create meeting notes in Markdown format with the following sections:
1. Summary (3-5 sentences)
2. Key Topics
3. Final Evaluations (clearly state the priorities or rankings decided in the discussion)
4. Rationale for Evaluations (reasons for each evaluation)
5. Remaining Issues`,
				ideation: `Create meeting notes in Markdown format with the following sections:
1. Summary (3-5 sentences)
2. List of Proposed Ideas (bullet points, briefly describe each idea)
3. Noteworthy Ideas (those with high originality or potential impact)
4. Combined/Evolved Ideas
5. Future Considerations`,
				free: `Create meeting notes in Markdown format with the following sections:
1. Summary (3-5 sentences)
2. Key Topics
3. Points of Agreement
4. Remaining Issues`
			}
		}
	} satisfies Record<Locale, {
		instruction: string;
		note: string;
		structures: Record<DiscussionFormat, string>;
	}>
} as const;
