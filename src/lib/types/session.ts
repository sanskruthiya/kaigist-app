import type { Persona } from './persona';

export interface SessionSetup {
	theme: string;
	supplement: string;
	personas: Persona[];
	rounds: number;
	direction: string;
	modelId: string;
}

export interface Utterance {
	id: string;
	round: number;
	speakerPersonaId: string;
	content: string;
	timestamp: number;
}

export interface Session {
	id: string;
	setup: SessionSetup;
	utterances: Utterance[];
	currentRound: number;
	status: 'setup' | 'running' | 'paused' | 'completed';
	meetingNotes?: string;
	createdAt: number;
	updatedAt: number;
}
