export interface Persona {
	id: string;
	name: string;
	ageGroup: string;
	expertise: string;
	stance: string;
	personality: string;
	color: string;
}

export const AVATAR_COLORS = [
	'#3B82F6', // blue
	'#10B981', // emerald
	'#F97316', // orange
	'#EF4444', // red
	'#8B5CF6', // violet
	'#EC4899', // pink
	'#14B8A6', // teal
	'#F59E0B'  // amber
] as const;

export function assignColor(index: number): string {
	return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function generateId(): string {
	return crypto.randomUUID();
}
