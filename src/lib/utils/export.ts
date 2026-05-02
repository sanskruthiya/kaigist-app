import type { Session } from '$lib/types/session';

function formatTimestamp(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function buildFilename(ext: string): string {
	return `kaigist-${formatTimestamp()}.${ext}`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function exportJSON(session: Session) {
	const data = {
		version: '1.0',
		exportedAt: new Date().toISOString(),
		...session
	};
	const json = JSON.stringify(data, null, 2);
	downloadFile(json, buildFilename('json'), 'application/json');
}

export function exportMarkdown(session: Session, meetingNotes: string) {
	const personaMap = new Map(session.setup.personas.map((p) => [p.id, p.name]));

	let md = meetingNotes + '\n\n---\n\n';
	md += `## 議論ログ\n\n`;

	let currentRound = 0;
	for (const u of session.utterances) {
		if (u.round !== currentRound) {
			currentRound = u.round;
			md += `\n### ラウンド ${currentRound}\n\n`;
		}
		if (u.speakerPersonaId === '__facilitator__') {
			md += `**🎙 ファシリテーター**: ${u.content}\n\n`;
		} else {
			const name = personaMap.get(u.speakerPersonaId) ?? '?';
			md += `**${name}**: ${u.content}\n\n`;
		}
	}

	downloadFile(md, buildFilename('md'), 'text/markdown');
}

export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

export function importJSON(file: File): Promise<Session> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(reader.result as string);
				if (!data.setup || !data.utterances) {
					throw new Error('Invalid Kaigist session file');
				}
				resolve(data as Session);
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = () => reject(new Error('Failed to read file'));
		reader.readAsText(file);
	});
}
