"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ordersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/axios";
import { Order } from "@/types";

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setOrders(await ordersApi.list());
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  return { orders, loading, reload };
}