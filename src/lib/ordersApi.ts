import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Order } from "@/types/order";

function mapDocToOrder(docSnap: any): Order {
  const data = docSnap.data();
  const createdAt =
    data.createdAt && typeof data.createdAt.toDate === "function"
      ? data.createdAt.toDate()
      : data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date(data.createdAt);

  const deadline =
    data.deadline && typeof data.deadline.toDate === "function"
      ? data.deadline.toDate()
      : data.deadline instanceof Timestamp
      ? data.deadline.toDate()
      : new Date(data.deadline);

  const deliveredAt =
    data.deliveredAt && typeof data.deliveredAt.toDate === "function"
      ? data.deliveredAt.toDate()
      : data.deliveredAt instanceof Timestamp
      ? data.deliveredAt.toDate()
      : undefined;

  return {
    id: docSnap.id,
    clientName: data.clientName,
    productDescription: data.productDescription,
    deadline,
    price: data.price,
    status: data.status,
    materials: data.materials || [],
    deductedMaterials: data.deductedMaterials || {},
    referenceImage: data.referenceImage || "",
    clientPhone: data.clientPhone || "",
    createdAt,
    deliveredAt,
  } as Order;
}

export function listenOrders(
  uid: string,
  onChange: (orders: Order[]) => void,
  onError?: (err: any) => void
) {
  if (!uid) {
    return () => {};
  }

  console.debug("[ordersApi] starting listener for uid:", uid);

  const colRef = collection(db, "users", uid, "orders");
  const q = query(colRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map(mapDocToOrder);
      onChange(orders);
    },
    (err) => {
      console.error("[ordersApi] snapshot error", err);
      if (onError) onError?.(err);
    }
  );

  return unsubscribe;
}

export async function addOrder(orderData: Omit<Order, "id" | "createdAt">) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado");

  const dataToSave = {
    ...orderData,
    createdAt: serverTimestamp(),
    createdBy: uid,
  } as any;

  const colRef = collection(db, "users", uid, "orders");
  return await addDoc(colRef, dataToSave);
}

export async function updateOrder(
  id: string,
  uid: string,
  updates: Partial<Order>
) {
  const docRef = doc(db, "users", uid, "orders", id);
  const data: any = { ...updates };
  if (data.deadline instanceof Date)
    data.deadline = Timestamp.fromDate(data.deadline);
  if (data.createdAt instanceof Date)
    data.createdAt = Timestamp.fromDate(data.createdAt);
  if (data.deliveredAt instanceof Date)
    data.deliveredAt = Timestamp.fromDate(data.deliveredAt);
  return await updateDoc(docRef, data);
}

export async function deleteOrder(id: string, uid: string) {
  const docRef = doc(db, "users", uid, "orders", id);
  return await deleteDoc(docRef);
}
