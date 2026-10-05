import { errorResponse, successResponse } from "@/lib/api-response";
import { generateAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { LoginInput, loginSchema } from "@/lib/validations/auth.validation";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const POST = async (request: NextRequest) => {
    try {
        let body: LoginInput;

        try {
            body = await request.json();
        } catch {
            return errorResponse(
                "Invalid request body",
                null,
                400,
            );
        }

        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return errorResponse(
                "Validation failed",
                validation.error.flatten().fieldErrors,
                422,
            );
        }

        const { email, password } = validation.data;

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return errorResponse(
                "Invalid email or password",
                null,
                401,
            );
        }

        const passwordValid = await bcrypt.compare(
            password,
            user.passwordHash,
        );

        if (!passwordValid) {
            return errorResponse(
                "Invalid email or password",
                null,
                401,
            );
        }

        const accessToken = generateAccessToken({
            userId: user.id,
            email: user.email,
        });

        const cookieStore = await cookies();

        cookieStore.set("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 15,
        });

        const userData = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,

        }

        return successResponse(
            "Login successful",
            userData ,
            200,
        );

    }
    catch (error) {
        console.error("LOGIN_ERROR:", error);

        return errorResponse(
            "Internal server error",
            null,
            500,
        );
    }

}