import { z } from "zod";

//login Schema
export const loginSchema  = z.object(
    {
        email: z
            .string()
            .max(255, "Email must be less than 255 characters")
            .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address")
            .nonempty("Email is required"),
        password: z
            .string()
            .min(6, "Password must be at least 6 characters")
            .max(255, "Password must be less than 255 characters")
            .nonempty("Password is required"),
    }
)

export type LoginInput = z.infer<typeof loginSchema>;