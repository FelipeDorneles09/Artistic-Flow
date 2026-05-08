import { create } from "zustand";
import { InventoryItem } from "@/types/inventory";
import {
  listenInventory,
  addInventoryItem as apiAddInventoryItem,
  updateInventoryItem as apiUpdateInventoryItem,
  deleteInventoryItem as apiDeleteInventoryItem,
} from "@/lib/inventoryApi";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface InventoryStore {
  items: InventoryItem[];
  addItem: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateItem: (id: string, updates: Partial<InventoryItem>, historyNote?: string, relatedOrderClient?: string, relatedOrderProduct?: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemById: (id: string) => InventoryItem | undefined;
}

export const useInventoryStore = create<InventoryStore>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  onAuthStateChanged(auth, (user) => {
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (e) {}
      unsubscribe = null;
    }

    if (user) {
      unsubscribe = listenInventory(
        user.uid,
        (items) => {
          set({ items });
        },
        (err) => {
          if (err && err.code === "permission-denied") {
            set({ items: [] });
          }
        }
      );
    } else {
      set({ items: [] });
    }
  });

  return {
    items: [],

    addItem: async (itemData) => {
      const docRef = await apiAddInventoryItem(itemData);
      return docRef.id;
    },

    updateItem: async (id, updates, historyNote, relatedOrderClient, relatedOrderProduct) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Usuário não autenticado");
      await apiUpdateInventoryItem(id, uid, updates, historyNote, relatedOrderClient, relatedOrderProduct);
    },

    deleteItem: async (id) => {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Usuário não autenticado");
      await apiDeleteInventoryItem(id, uid);
    },

    getItemById: (id) => {
      return get().items.find((item) => item.id === id);
    },
  };
});
