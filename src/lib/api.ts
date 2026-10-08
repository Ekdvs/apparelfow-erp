import api, { unwrap } from "@/lib/axios";
import { Order, Recipe, SewingOrder, User } from "@/types";

export const authApi = {
  login: (email: string, password: string) =>
    unwrap<User>(api.post("/api/auth/login", { email, password })),
  logout: () => unwrap<null>(api.post("/api/user/logout")),
  me: () => unwrap<User>(api.get("/api/user/me")),
};

export const recipesApi = {
  list: () => unwrap<Recipe[]>(api.get("/api/recipes")),
};

export const ordersApi = {
  list: () => unwrap<Order[]>(api.get("/api/orders")),
  get: (id: string) => unwrap<Order>(api.get(`/api/orders/${id}`)),
  create: (body: {
    recipeId: string;
    targetQty: number;
    fabricRollId: string;
    actualFabricYds: number;
  }) => unwrap<Order>(api.post("/api/orders", body)),
  saveCounts: (
    id: string,
    counts: { componentId: string; actualQty: number }[],
  ) => unwrap<unknown>(api.patch(`/api/orders/${id}/counts`, { counts })),
  approve: (id: string) =>
    unwrap<unknown>(api.post(`/api/orders/${id}/approve`)),
  reject: (id: string, reason: string) =>
    unwrap<unknown>(api.post(`/api/orders/${id}/reject`, { reason })),
  resubmit: (id: string, actualFabricYds?: number) =>
    unwrap<Order>(
      api.post(
        `/api/orders/${id}/resubmit`,
        actualFabricYds ? { actualFabricYds } : {},
      ),
    ),
};

export const sewingApi = {
  queue: () => unwrap<SewingOrder[]>(api.get("/api/sewing/queue")),
  start: (id: string) => unwrap<unknown>(api.post(`/api/sewing/${id}/start`)),
};
