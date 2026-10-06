import { UserRole } from "@/generated/prisma/enums";
import { requireRole } from "./authorization";
import { errorResponse } from "./api-response";
import { DomainError } from "./errors";
import { z } from "zod";

export const authorize = async (roles: UserRole[]) => {
    const { user, error } = await requireRole(roles);

    if (error === "UNAUTHORIZED") {
        return {
            ok: false as const,
            res: errorResponse("Unauthorized", null, 401),
        };
    }

    if (error === "FORBIDDEN") {
        return {
            ok: false as const,
            res: errorResponse("Forbidden", null, 403),
        };
    }

    return {
        ok: true as const,
        user: user!,
    };
};

export async function parseBody<T extends z.ZodTypeAny>(
    request: Request,
    schema: T,
): Promise<z.infer<T>> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        throw new DomainError("Invalid or empty request body", 400);
    }

    const result = schema.safeParse(raw);
    if (!result.success)
        throw new DomainError("Validation failed", 422, result.error.flatten());
    return result.data;
}

export const handleError = (error: unknown, tag: string) => {
    if (error instanceof DomainError)
        return errorResponse(error.message, error.details ?? null, error.status);
    console.error(tag, error);
    return errorResponse("Internal server error", null, 500);
};
