import { db, auth } from "./firebase";
import {
  doc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { PricingSettings } from "@/types/pricing";

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  id: "default",
  monthlyFixedCosts: 0,
  workingHoursPerMonth: 160,
  hourlyRate: 10,
  profitMarginPercent: 30,
  monthlyGoal: 0,
};

export function listenPricingSettings(
  uid: string,
  onChange: (settings: PricingSettings) => void,
  onError?: (err: any) => void
) {
  if (!uid) return () => {};
  
  const docRef = doc(db, "users", uid, "pricingSettings", "default");
  
  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onChange({ id: docSnap.id, ...docSnap.data() } as PricingSettings);
      } else {
        onChange(DEFAULT_PRICING_SETTINGS);
      }
    },
    (err) => {
      console.error("[pricingApi] snapshot error", err);
      if (onError) onError?.(err);
    }
  );

  return unsubscribe;
}

export async function savePricingSettings(settings: Omit<PricingSettings, "id">) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Usuário não autenticado");
  
  const docRef = doc(db, "users", uid, "pricingSettings", "default");
  return await setDoc(docRef, settings, { merge: true });
}
