import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validatePositiveDecimal, validateWholeNumber } from "@/lib/validators";
import {
  countsSchema,
  createOrderSchema,
  rejectSchema,
  resubmitSchema,
} from "@/lib/validations/order.validation";

const base = { recipeId: randomUUID(), targetQty: 50, fabricRollId: "FAB-ROLL-882", actualFabricYds: 92 };

describe("createOrderSchema", () => {
  it("accepts a valid order", () => {
    expect(createOrderSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ["decimal quantity", { targetQty: 5.5 }],
    ["negative quantity", { targetQty: -3 }],
    ["zero quantity", { targetQty: 0 }],
    ["string quantity", { targetQty: "50" }],
    ["null quantity", { targetQty: null }],
    ["empty roll id", { fabricRollId: "" }],
    ["whitespace roll id", { fabricRollId: "    " }],
    ["zero fabric", { actualFabricYds: 0 }],
    ["negative fabric", { actualFabricYds: -1 }],
    ["string fabric", { actualFabricYds: "92" }],
    ["bad recipe id", { recipeId: "not-a-uuid" }],
    ["client-supplied status", { status: "VERIFIED" }],
    ["client-supplied createdBy", { createdBy: "someone-else" }],
  ])("rejects %s", (_label, patch) => {
    expect(createOrderSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  });

  it("rejects an empty payload", () => {
    expect(createOrderSchema.safeParse({}).success).toBe(false);
  });
});

describe("countsSchema", () => {
  const id = randomUUID();

  it("accepts whole numbers including 0", () => {
    expect(countsSchema.safeParse({ counts: [{ componentId: id, actualQty: 0 }] }).success).toBe(true);
  });

  it.each([
    ["negative", [{ componentId: id, actualQty: -1 }]],
    ["decimal", [{ componentId: id, actualQty: 1.5 }]],
    ["string", [{ componentId: id, actualQty: "10" }]],
    ["empty list", []],
    ["duplicate component", [{ componentId: id, actualQty: 1 }, { componentId: id, actualQty: 2 }]],
  ])("rejects %s", (_label, counts) => {
    expect(countsSchema.safeParse({ counts }).success).toBe(false);
  });
});

describe("rejectSchema / resubmitSchema", () => {
  it("requires a real reason", () => {
    expect(rejectSchema.safeParse({ reason: "Sleeve shortage, 10 missing" }).success).toBe(true);
    for (const reason of ["", "     ", "abc", 123, undefined]) {
      expect(rejectSchema.safeParse({ reason }).success).toBe(false);
    }
  });

  it("trims the reason", () => {
    const r = rejectSchema.parse({ reason: "   Fabric defect on roll   " });
    expect(r.reason).toBe("Fabric defect on roll");
  });

  it("resubmit accepts empty body or positive yards only", () => {
    expect(resubmitSchema.safeParse({}).success).toBe(true);
    expect(resubmitSchema.safeParse({ actualFabricYds: 95.5 }).success).toBe(true);
    expect(resubmitSchema.safeParse({ actualFabricYds: -5 }).success).toBe(false);
    expect(resubmitSchema.safeParse({ status: "VERIFIED" }).success).toBe(false);
  });
});

describe("frontend input guards", () => {
  it.each(["", "   ", "-5", "2.5", "abc", "1e3", "5 5", "1,000"])("count %j is rejected", (v) => {
    expect(validateWholeNumber(v)).not.toBeNull();
  });

  it.each(["0", "7", " 42 ", "1000000"])("count %j is accepted", (v) => {
    expect(validateWholeNumber(v)).toBeNull();
  });

  it("quantity must be at least 1", () => {
    expect(validateWholeNumber("0", 1)).not.toBeNull();
  });

  it.each(["", "-1", "0", "abc", "1.234", "1e2"])("yards %j is rejected", (v) => {
    expect(validatePositiveDecimal(v)).not.toBeNull();
  });

  it.each(["92", "92.5", "0.25"])("yards %j is accepted", (v) => {
    expect(validatePositiveDecimal(v)).toBeNull();
  });
});