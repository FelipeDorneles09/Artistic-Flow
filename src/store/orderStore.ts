import { create } from "zustand";
import { toast } from "@/hooks/use-toast";
import { Order, OrderStatus } from "@/types/order";
import {
  listenOrders,
  addOrder as apiAddOrder,
  updateOrder as apiUpdateOrder,
  deleteOrder as apiDeleteOrder,
} from "@/lib/ordersApi";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { goalEvents } from "@/lib/goalEvents";
import { usePricingStore } from "./pricingStore";

interface OrderStore {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "createdAt">) => Promise<void>;
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getActiveOrders: () => Order[];
  getDeliveredOrders: () => Order[];
}

import { useInventoryStore } from "./inventoryStore";

export const useOrderStore = create<OrderStore>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  // start/stop listener based on auth state
  onAuthStateChanged(auth, (user) => {
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (e) {
        // ignore
      }
      unsubscribe = null;
    }

    if (user) {
      unsubscribe = listenOrders(
        user.uid,
        (orders) => {
          set({ orders });
        },
        (err) => {
          console.error("[orderStore] listener error", err);
          // if permission-denied, clear orders to avoid stale state
          if (err && err.code === "permission-denied") {
            set({ orders: [] });
          }
        },
      );
    } else {
      set({ orders: [] });
    }
  });

  return {
    orders: [],

    addOrder: async (orderData) => {
      await apiAddOrder(orderData);
    },

    updateOrder: async (id, updates) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Usuário não autenticado");

      const order = get().orders.find((o) => o.id === id);
      // Auto-deduct any newly added quantity if order is already out of to_buy
      if (order && order.status !== 'to_buy' && updates.materials) {
        let hasDeducted = false;
        const currentDeducted: Record<string, number> = { ...(order.deductedMaterials || {}) };
        const invState = useInventoryStore.getState();
        const inventoryItems = invState.items;
        const updateInv = invState.updateItem;

        for (const mat of updates.materials) {
           const requiredQty = parseFloat(mat.quantity) || 1;
           const alreadyDeducted = currentDeducted[mat.id] || 0;
           const deltaToDeduct = requiredQty - alreadyDeducted;
           
           if (deltaToDeduct > 0) {
              const invItem = inventoryItems.find((i) => i.id === mat.id);
              if (invItem) {
                const clientName = order.clientName ?? updates.clientName;
                const productDesc = order.productDescription ?? updates.productDescription;
                await updateInv(
                  invItem.id,
                  { quantity: invItem.quantity - deltaToDeduct },
                  'Dedução de pedido',
                  clientName,
                  productDesc,
                );
                currentDeducted[mat.id] = requiredQty;
                hasDeducted = true;
              }
           }
        }

        if (hasDeducted) {
           toast({ title: "Estoque atualizado", description: "Nova quantidade deduzida automaticamente" });
           updates.deductedMaterials = currentDeducted;
        }
      }

      await apiUpdateOrder(id, uid, updates as Partial<Order>);
    },

    updateOrderStatus: async (id, status) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Usuário não autenticado");
      
      const order = get().orders.find((o) => o.id === id);
      if (!order || order.status === status) return;

      const invState = useInventoryStore.getState();
      const inventoryItems = invState.items;
      const updateInv = invState.updateItem;

      // Moving OUT of to_buy → deduct only the delta not yet deducted
      if (order.status === 'to_buy' && status !== 'to_buy') {
        const currentDeducted: Record<string, number> = { ...(order.deductedMaterials || {}) };
        let hasDeducted = false;

        for (const mat of order.materials) {
          const requiredQty = parseFloat(mat.quantity) || 1;
          const alreadyDeducted = currentDeducted[mat.id] || 0;
          const deltaToDeduct = requiredQty - alreadyDeducted;

          if (deltaToDeduct > 0) {
            const invItem = inventoryItems.find((i) => i.id === mat.id);
            if (invItem) {
              await updateInv(
                invItem.id,
                { quantity: invItem.quantity - deltaToDeduct },
                'Dedução de pedido',
                order.clientName,
                order.productDescription,
              );
              currentDeducted[mat.id] = requiredQty;
              hasDeducted = true;
            }
          }
        }

        if (hasDeducted) {
          toast({ title: "Estoque atualizado", description: "Quantidade deduzida do estoque" });
        }

        // Always save status + deductedMaterials together so the map is never lost
        await apiUpdateOrder(id, uid, { status, deductedMaterials: currentDeducted } as Partial<Order>);
        return;
      }

      // Moving BACK to to_buy → keep deductedMaterials intact so we remember what was already deducted
      if (order.status !== 'to_buy' && status === 'to_buy') {
        try {
          toast({ title: "Aviso", description: "Quantidade não devolvida ao estoque" });
          await apiUpdateOrder(id, uid, { status } as Partial<Order>);
        } catch (err: any) {
          console.error("Erro ao voltar pedido para to_buy:", err);
          toast({ title: "Erro", description: err.message, variant: "destructive" });
        }
        return;
      }

      // For any other transition (e.g. production → finishing) just update status
      // If becoming delivered, stamp deliveredAt and check monthly goal
      if (status === 'delivered') {
        await apiUpdateOrder(id, uid, { status, deliveredAt: new Date() } as Partial<Order>);

        // ── Goal check ────────────────────────────────────────────
        const { settings } = usePricingStore.getState();
        const goal = settings?.monthlyGoal ?? 0;
        if (goal > 0) {
          const now = new Date();
          const allOrders = get().orders;
          const monthKey = `goal-celebrated-${now.getFullYear()}-${now.getMonth()}`;

          // Sum revenue of all delivered orders this calendar month
          // (the current order is still in state with old status, so we add its price manually)
          const monthRevenueBefore = allOrders
            .filter((o) => {
              if (o.status !== 'delivered') return false;
              const d = o.deliveredAt
                ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
                : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            })
            .reduce((sum, o) => sum + (o.price ?? 0), 0);

          const monthRevenueAfter = monthRevenueBefore + order.price;

          // Store the GOAL VALUE that was celebrated (not just '1').
          // Celebration resets whenever the goal changes — up OR down.
          const celebratedGoal = parseFloat(sessionStorage.getItem(monthKey) ?? '0');
          const alreadyCelebrated = celebratedGoal === goal;

          console.log(`[GoalCheck] antes=${monthRevenueBefore} depois=${monthRevenueAfter} meta=${goal} metaCelebrada=${celebratedGoal}`);

          // Fire if revenue hit/exceeded the goal AND we haven't celebrated THIS goal yet
          if (monthRevenueAfter >= goal && !alreadyCelebrated) {
            sessionStorage.setItem(monthKey, String(goal));
            goalEvents.emit({
              orderPrice: order.price,
              totalRevenue: monthRevenueAfter,
              goal,
            });
          }
        }
      } else {
        await apiUpdateOrder(id, uid, { status } as Partial<Order>);
      }
    },

    deleteOrder: async (id) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Usuário não autenticado");

      const order = get().orders.find((o) => o.id === id);
      if (order && order.status !== 'to_buy') {
        const invState = useInventoryStore.getState();
        const inventoryItems = invState.items;
        const updateInv = invState.updateItem;
        for (const mat of order.materials) {
          const invItem = inventoryItems.find((i) => i.id === mat.id);
          if (invItem) {
            const qty = order.deductedMaterials?.[mat.id] || (parseFloat(mat.quantity) || 1);
            if (qty > 0) {
               await updateInv(invItem.id, { quantity: invItem.quantity + qty });
            }
          }
        }
      }

      await apiDeleteOrder(id, uid);
    },

    getOrdersByStatus: (status) => {
      return get().orders.filter((order) => order.status === status);
    },

    getActiveOrders: () => {
      return get().orders.filter((order) => order.status !== "delivered");
    },

    getDeliveredOrders: () => {
      return get().orders.filter((order) => order.status === "delivered");
    },
  };
});
