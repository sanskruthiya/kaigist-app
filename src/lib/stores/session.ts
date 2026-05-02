import { writable, get, derived } from 'svelte/store';
import type { Session, SessionSetup, Utterance } from '$lib/types/session';
import type { Persona } from '$lib/types/persona';
import { generateId } from '$lib/types/persona';

const STORAGE_KEY = 'kaigist-current-session';

function createSessionStore() {
	const { subscribe, set, update } = writable<Session | null>(null);

	function save(session: Session) {
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		}
	}

	return {
		subscribe,

		init(setup: SessionSetup) {
			const session: Session = {
				id: generateId(),
				setup,
				utterances: [],
				currentRound: 1,
				status: 'running',
				createdAt: Date.now(),
				updatedAt: Date.now()
			};
			set(session);
			save(session);
		},

		addUtterance(personaId: string, content: string, round: number) {
			update((s) => {
				if (!s) return s;
				const utterance: Utterance = {
					id: generateId(),
					round,
					speakerPersonaId: personaId,
					content,
					timestamp: Date.now()
				};
				s.utterances = [...s.utterances, utterance];
				s.updatedAt = Date.now();
				save(s);
				return s;
			});
		},

		addFacilitatorComment(content: string, round: number) {
			update((s) => {
				if (!s) return s;
				const utterance: Utterance = {
					id: generateId(),
					round,
					speakerPersonaId: '__facilitator__',
					content,
					timestamp: Date.now()
				};
				s.utterances = [...s.utterances, utterance];
				s.updatedAt = Date.now();
				save(s);
				return s;
			});
		},

		setRound(round: number) {
			update((s) => {
				if (!s) return s;
				s.currentRound = round;
				s.updatedAt = Date.now();
				save(s);
				return s;
			});
		},

		setStatus(status: Session['status']) {
			update((s) => {
				if (!s) return s;
				s.status = status;
				s.updatedAt = Date.now();
				save(s);
				return s;
			});
		},

		setMeetingNotes(notes: string) {
			update((s) => {
				if (!s) return s;
				s.meetingNotes = notes;
				s.updatedAt = Date.now();
				save(s);
				return s;
			});
		},

		load() {
			if (typeof window === 'undefined') return;
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) set(JSON.parse(stored));
			} catch {
				// ignore
			}
		},

		extendRounds(additionalRounds: number) {
			update((s) => {
				if (!s) return s;
				s.setup.rounds += additionalRounds;
				s.updatedAt = Date.now();
				save(s);
				return s;
			});
		},

		clear() {
			set(null);
			if (typeof window !== 'undefined') {
				localStorage.removeItem(STORAGE_KEY);
			}
		}
	};
}

export const session = createSessionStore();

export const currentPersonas = derived(session, ($s) => $s?.setup.personas ?? []);
export const currentUtterances = derived(session, ($s) => $s?.utterances ?? []);
export const currentRound = derived(session, ($s) => $s?.currentRound ?? 1);
export const maxRounds = derived(session, ($s) => $s?.setup.rounds ?? 5);
export const sessionStatus = derived(session, ($s) => $s?.status ?? 'setup');
