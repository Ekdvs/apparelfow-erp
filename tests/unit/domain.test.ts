import { describe, expect, it } from "vitest";
import type { CuttingOrderStatus } from "@/generated/prisma/enums";
import { assertTransition } from "@/lib/domain/state-machine";
import { evaluateStatus, isBlocking } from "@/lib/domain/traffic-light";
import { calcWastagePct } from "@/lib/domain/wastage";
import { DomainError } from "@/lib/errors";

describe("traffic light", () => {
  it.each([
    [100, 100, "GREEN"],
    [100, 101, "YELLOW"],
    [100, 99, "RED"],
    [5, 0, "RED"],
    [0, 0, "GREEN"],
  ])("expected %i / actual %i -> %s", (expected, actual, light) => {
    expect(evaluateStatus(expected, actual)).toBe(light);
  });

  it("returns null for an uncounted component", () => {
    expect(evaluateStatus(100, null as never)).toBeNull();
  });

  it("blocks RED and uncounted, but not GREEN or YELLOW", () => {
    expect(isBlocking("RED")).toBe(true);
    expect(isBlocking(null)).toBe(true);
    expect(isBlocking("GREEN")).toBe(false);
    expect(isBlocking("YELLOW")).toBe(false);
  });
});

describe("fabric wastage %", () => {
  it("is positive when more fabric than expected was used", () => {
    expect(calcWastagePct(21, 2, 10)).toBeCloseTo(5, 2); // expected 20 yds
  });

  it("is negative when less fabric was used", () => {
    expect(calcWastagePct(19, 2, 10)).toBeCloseTo(-5, 2);
  });

  it("rounds to 2 decimals (spec example: 1.8 yds x 50)", () => {
    expect(calcWastagePct(92, 1.8, 50)).toBe(2.22);
  });

  it("never divides by zero", () => {
    expect(calcWastagePct(10, 2, 0)).toBe(0);
  });
});

describe("state machine (all 16 transitions)", () => {
  const all: CuttingOrderStatus[] = ["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "IN_SEWING"];
  const legal = new Set([
    "PENDING_VERIFICATION>VERIFIED",
    "PENDING_VERIFICATION>REJECTED",
    "REJECTED>PENDING_VERIFICATION",
    "VERIFIED>IN_SEWING",
  ]);

  const statusOf = (fn: () => void) => {
    try {
      fn();
      return null;
    } catch (e) {
      return e instanceof DomainError ? e.status : -1;
    }
  };

  for (const from of all) {
    for (const to of all) {
      const ok = legal.has(`${from}>${to}`);
      it(`${from} -> ${to} is ${ok ? "allowed" : "blocked with 409"}`, () => {
        expect(statusOf(() => assertTransition(from, to))).toBe(ok ? null : 409);
      });
    }
  }
});