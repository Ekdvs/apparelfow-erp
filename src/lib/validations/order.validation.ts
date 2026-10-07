
import {z} from 'zod';

export const createOrderSchema = z.object({
  recipeId: z
    .string()
    .uuid("recipeId must be a valid UUID"),

  targetQty: z
    .number("targetQty must be a number")
    .int("targetQty must be an integer")
    .positive("targetQty must be a positive number")
    .max(100000, "targetQty must be less than or equal to 100000"),

  fabricRollId: z
    .string()
    .trim()
    .min(1, "fabricRollId cannot be empty")
    .max(50, "fabricRollId must be less than or equal to 50 characters"),

  actualFabricYds: z
    .number("actualFabricYds must be a number")
    .positive("actualFabricYds must be a positive number")
    .max(100000, "actualFabricYds must be less than or equal to 100000"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const countsSchema = z.object(
    {
        counts :z
            .array(
                z.object(
                    {
                        componentId: z
                            .string()
                            .uuid('componentId must be a valid UUID'),
                        
                        actualQty: z
                            .number("actualQty must be a number")
                            .int("whole numbers only")
                            .min(0, "actualQty must be a positive number")
                            .max(100000, 'actualQty must be less than or equal to 100000'),
                    }
                )
            ).min(1)
            .refine(a => new Set(a.map(c => c.componentId)).size === a.length, "Duplicate components")
    }
)

export type CountsInput = z.infer<typeof countsSchema>;

export const rejectSchema = z.object(
    {
        reason:z
            .string()
            .trim()
            .min(5, 'Rejection reason is required (min 5 characters)')
            .max(500, 'reason must be less than or equal to 500 characters'),
    }
)

export type RejectInput = z.infer<typeof rejectSchema>;

export const resubmitSchema = z.object(
    {
        actualFabricYds:z
            .number("actualFabricYds must be a number")
            .positive('actualFabricYds must be a positive number')
            .max(100000, 'actualFabricYds must be less than or equal to 100000'),
    }
)

export type ResubmitInput = z.infer<typeof resubmitSchema>;
