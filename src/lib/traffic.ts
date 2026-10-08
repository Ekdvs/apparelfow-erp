import { Light } from "@/types";

export const evaluate = (expected: number, actual: number): Light =>
  actual === expected ? "GREEN" : actual > expected ? "YELLOW" : "RED";
