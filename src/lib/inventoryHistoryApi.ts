import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

export type HistoryEventType =
  | "manual_add"
  | "manual_subtract"
  | "manual_set"
  | "order_deduction"
  | "order_refund"
  | "item_created"
  | "item_deleted"
  | "price_change";

export interface InventoryHistoryEntry {
  id: string;
  itemId: string;
  itemName: string;
  eventType: HistoryEventType;
  previousQty: number;
  newQty: number;
  delta: number;
  unit: string;
  note?: string;
  relatedOrderClient?: string;
  relatedOrderProduct?: string;
  previousCost?: number; // Custo anterior (para price_change)
  newCost?: number;      // Novo custo (para price_change)
  createdAt: Date;
}

export async function addHistoryEntry(
  entry: Omit<InventoryHistoryEntry, "id" | "createdAt">
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // Firestore rejects undefined values — strip them before saving
  const clean = Object.fromEntries(
    Object.entries(entry).filter(([, v]) => v !== undefined)
  );

  const colRef = collection(db, "users", uid, "inventoryHistory");
  await addDoc(colRef, {
    ...clean,
    createdAt: serverTimestamp(),
  });
}

export async function fetchInventoryHistory(): Promise<InventoryHistoryEntry[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  const colRef = collection(db, "users", uid, "inventoryHistory");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt);
    return {
      id: doc.id,
      ...data,
      createdAt,
    } as InventoryHistoryEntry;
  });
}
