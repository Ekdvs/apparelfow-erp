import { Role } from "@/types";

export const HOME: Record<Role, string> = {
  CUTTING_SUPERVISOR: "/supervisor",
  CUTTING_VERIFIER: "/verifier",
  SEWING_SUPERVISOR: "/sewing",
};

export const ROLE_LABEL: Record<Role, string> = {
  CUTTING_SUPERVISOR: "Cutting Supervisor",
  CUTTING_VERIFIER: "Cutting Verifier",
  SEWING_SUPERVISOR: "Sewing Supervisor",
};

export const DEMO_USERS = [
  { role: "CUTTING_SUPERVISOR" as Role, email: "supervisor@apparelflow.demo", password: "Supervisor@123" },
  { role: "CUTTING_VERIFIER" as Role, email: "verifier@apparelflow.demo", password: "Verifier@123" },
  { role: "SEWING_SUPERVISOR" as Role, email: "sewing@apparelflow.demo", password: "Sewing@123" },
];