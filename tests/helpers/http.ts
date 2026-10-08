/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";

export interface Envelope {
    success: boolean;
    message: string;
    data: any;
    error: any;
}

export interface Result {
    status: number;
    body: Envelope;
}

export const jsonReq = (method: string, body?: unknown, url = "http://localhost/api/test") =>
    new NextRequest(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

export const idCtx = (id: string) => ({ params: Promise.resolve({ id }) });

export const run = async (pending: Promise<Response>): Promise<Result> => {
    const res = await pending;
    return { status: res.status, body: (await res.json()) as Envelope };
};