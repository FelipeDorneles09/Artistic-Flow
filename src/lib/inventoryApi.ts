import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { InventoryItem } from "@/types/inventory";
import { addHistoryEntry } from "./inventoryHistoryApi";

function mapDocToItem(docSnap: any): InventoryItem {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  } as InventoryItem;
}

export function listenInventory(
  uid: string,
  onChange: (items: InventoryItem[]) => void,
  onError?: (err: any) => void
) {
  if (!uid) {
    return () => {};
  }

  const colRef = collection(db, "users", uid, "inventory");
  const q = query(colRef);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(mapDocToItem);
      onChange(items);
    },
    (err) => {
      console.error("[inventoryApi] snapshot error", err);
      if (onError) onError?.(err);
    }
  );

  return unsubscribe;
}

export async function addInventoryItem(itemData: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado");

  const dataToSave = {
    ...itemData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const colRef = collection(db, "users", uid, "inventory");
  const docRef = await addDoc(colRef, dataToSave);

  await addHistoryEntry({
    itemId: docRef.id,
    itemName: itemData.name,
    eventType: "item_created",
    previousQty: 0,
    newQty: itemData.quantity,
    delta: itemData.quantity,
    unit: itemData.unit,
    note: "Item criado no estoque",
  });

  return docRef;
}

export async function updateInventoryItem(
  id: string,
  uid: string,
  updates: Partial<InventoryItem>,
  historyNote?: string,
  relatedOrderClient?: string,
  relatedOrderProduct?: string,
) {
  const docRef = doc(db, "users", uid, "inventory", id);

  // Read current state before updating for accurate history delta
  let previousQty = 0;
  let previousCost: number | undefined;
  let itemName = updates.name || "";
  let unit = updates.unit || "";
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      previousQty = d.quantity ?? 0;
      previousCost = typeof d.costPerUnit === 'number' ? d.costPerUnit : undefined;
      if (!itemName) itemName = d.name || "";
      if (!unit) unit = d.unit || "";
    }
  } catch (_) {
    // ignore read errors — history just won't have context
  }

  const data: any = { ...updates, updatedAt: serverTimestamp() };
  await updateDoc(docRef, data);

  if (updates.quantity !== undefined) {
    const newQty = updates.quantity;
    const delta = newQty - previousQty;

    let eventType: import("./inventoryHistoryApi").HistoryEventType = "manual_set";
    if (historyNote?.toLowerCase().includes("pedido") || historyNote?.toLowerCase().includes("dedu")) {
      eventType = delta < 0 ? "order_deduction" : "order_refund";
    } else if (delta > 0) {
      eventType = "manual_add";
    } else if (delta < 0) {
      eventType = "manual_subtract";
    }

    await addHistoryEntry({
      itemId: id,
      itemName,
      eventType,
      previousQty,
      newQty,
      delta,
      unit,
      note: historyNote,
      relatedOrderClient,
      relatedOrderProduct,
    });
  }

  // Track price changes separately
  if (
    updates.costPerUnit !== undefined &&
    previousCost !== undefined &&
    updates.costPerUnit !== previousCost
  ) {
    await addHistoryEntry({
      itemId: id,
      itemName,
      eventType: "price_change",
      previousQty,
      newQty: previousQty,
      delta: 0,
      unit,
      note: `Custo atualizado: R$ ${previousCost.toFixed(2)} → R$ ${updates.costPerUnit.toFixed(2)}`,
      previousCost,
      newCost: updates.costPerUnit,
    });
  }
}

export async function deleteInventoryItem(id: string, uid: string) {
  const docRef = doc(db, "users", uid, "inventory", id);

  let itemName = "";
  let qty = 0;
  let unit = "";
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      itemName = d.name || "";
      qty = d.quantity ?? 0;
      unit = d.unit || "";
    }
  } catch (_) {}

  await deleteDoc(docRef);

  await addHistoryEntry({
    itemId: id,
    itemName,
    eventType: "item_deleted",
    previousQty: qty,
    newQty: 0,
    delta: -qty,
    unit,
    note: "Item removido do estoque",
  });
}
