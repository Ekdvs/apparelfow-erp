export type Light = "GREEN" | "YELLOW" | "RED";

export const evaluateStatus = (
  expected: number,
  actual: number,
): Light | null => {
  if (actual === null) return null; // uncounted
  if (actual === expected) return "GREEN";
  return actual > expected ? "YELLOW" : "RED";
};

export const isBlocking = (light: Light | null) =>
  light === null || light === "RED";
