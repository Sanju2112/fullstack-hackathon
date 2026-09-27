export type GoalKey = string;
export type Goal = { key: GoalKey; label: string; unit: string; target: number; enabled: boolean };
export type Entry = { date: string; [key: string]: string | number };
export const goalMeta: Record<string, { label: string; unit: string; icon: string; color: string }> = {
  water: { label: "Water", unit: "glasses", icon: "💧", color: "blue" },
  exercise: { label: "Movement", unit: "minutes", icon: "⚡", color: "orange" },
  sleep: { label: "Sleep", unit: "hours", icon: "☾", color: "purple" },
  meditation: { label: "Mindfulness", unit: "minutes", icon: "✦", color: "green" }
};
export const defaultGoals: Goal[] = [
  { key: "water", label: "Water", unit: "glasses", target: 8, enabled: true }, { key: "exercise", label: "Movement", unit: "minutes", target: 30, enabled: true },
  { key: "sleep", label: "Sleep", unit: "hours", target: 8, enabled: true }, { key: "meditation", label: "Mindfulness", unit: "minutes", target: 10, enabled: true }
];
