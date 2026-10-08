import { Order } from "@/types";
import { OrderStatusBadge } from "@/components/StatusBadge";

export default function OrdersTable({
  orders,
  action,
}: {
  orders: Order[];
  action: (o: Order) => React.ReactNode;
}) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-400 bg-white p-8 text-center text-gray-700">
        No orders found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
      <table className="min-w-full text-left text-sm text-gray-900">
        <thead className="bg-gray-100 text-xs uppercase text-gray-800">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Recipe</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Fabric roll</th>
            <th className="px-4 py-3">Fabric (yds)</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3 font-semibold">{o.orderNo}</td>
              <td className="px-4 py-3">
                {o.recipe.name} <span className="text-gray-700">({o.recipe.recipeCode})</span>
              </td>
              <td className="px-4 py-3">{o.targetQty}</td>
              <td className="px-4 py-3">{o.fabricRollId}</td>
              <td className="px-4 py-3">{o.actualFabricYds}</td>
              <td className="px-4 py-3">
                <OrderStatusBadge status={o.status} />
              </td>
              <td className="px-4 py-3">{new Date(o.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{action(o)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}