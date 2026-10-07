import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { successResponse } from "@/lib/api-response";
import { authorize, handleError } from "@/lib/route-helpers";

export const GET = async () => {
  try {
    const auth = await authorize([
      UserRole.CUTTING_SUPERVISOR,
      UserRole.CUTTING_VERIFIER,
    ]);

    if (!auth.ok){
       return auth.res;
    }

    const recipes = await prisma.recipe.findMany({
      include: { components: true },
      orderBy: { recipeCode: "asc" },
    });
    
    return successResponse("Recipes retrieved", recipes);
  } catch (e) {
    return handleError(e, "RECIPES_ERROR");
  }
};
