import { POST as approveRoute } from "@/app/api/orders/[id]/approve/route";
import { PATCH as countsRoute } from "@/app/api/orders/[id]/counts/route";
import { POST as rejectRoute } from "@/app/api/orders/[id]/reject/route";
import { POST as resubmitRoute } from "@/app/api/orders/[id]/resubmit/route";
import { POST as createOrderRoute } from "@/app/api/orders/route";
import { POST as startRoute } from "@/app/api/sewing/[id]/start/route";
import { GET as queueRoute } from "@/app/api/sewing/queue/route";
import type { Fixtures } from "./db";
import { idCtx, jsonReq, run } from "./http";
import { actAs } from "./session";

export interface OrderItem {
    componentId: string;
    expectedQty: number;
    component: { componentName: string };
}

// Direct calls into the real route handlers (same code the network would hit)
export const api = {
    createOrder: (data?: unknown) => run(createOrderRoute(jsonReq("POST", data))),
    saveCounts: (id: string, counts: unknown) => run(countsRoute(jsonReq("PATCH", { counts }), idCtx(id))),
    approve: (id: string, body?: unknown) => run(approveRoute(jsonReq("POST", body), idCtx(id))),
    reject: (id: string, body?: unknown) => run(rejectRoute(jsonReq("POST", body), idCtx(id))),
    resubmit: (id: string, body: unknown = {}) => run(resubmitRoute(jsonReq("POST", body), idCtx(id))),
    startSewing: (id: string) => run(startRoute(jsonReq("POST"), idCtx(id))),
    // The handler takes no arguments and ignores the URL, which is the point of the isolation test
    queue: (url = "http://localhost/api/sewing/queue") =>
        run((queueRoute as unknown as (req: Request) => Promise<Response>)(jsonReq("GET", undefined, url))),
};

export async function newPendingOrder(fx: Fixtures, opts: { qty?: number; yards?: number } = {}) {
    actAs(fx.supervisor);
    const res = await api.createOrder({
        recipeId: fx.recipeId,
        targetQty: opts.qty ?? 10,
        fabricRollId: "FAB-TEST-1",
        actualFabricYds: opts.yards ?? 21,
    });
    if (res.status !== 201) throw new Error(`Test setup failed: ${JSON.stringify(res.body)}`);
    return { id: res.body.data.id as string, items: res.body.data.verificationItems as OrderItem[] };
}

export const exactCounts = (items: OrderItem[]) =>
    items.map((i) => ({ componentId: i.componentId, actualQty: i.expectedQty }));

export async function approvedOrder(fx: Fixtures, opts: { qty?: number; yards?: number } = {}) {
    const order = await newPendingOrder(fx, opts);
    actAs(fx.verifier);
    await api.saveCounts(order.id, exactCounts(order.items));
    const res = await api.approve(order.id);
    if (res.status !== 200) throw new Error(`Approve setup failed: ${JSON.stringify(res.body)}`);
    return order;
}