export const ROLE_COLORS: Record<string, string> = {
  mayor: "#f59e0b",
  polecat: "#3b82f6",
  witness: "#8b5cf6",
  refinery: "#10b981",
  deacon: "#ef4444",
  crew: "#6366f1",
};

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] ?? "#6b7280";
}
