import { create } from "zustand";
import { PricingSettings } from "@/types/pricing";
import { listenPricingSettings, savePricingSettings, DEFAULT_PRICING_SETTINGS } from "@/lib/pricingApi";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface PricingStore {
  settings: PricingSettings;
  updateSettings: (settings: Omit<PricingSettings, "id">) => Promise<void>;
}

export const usePricingStore = create<PricingStore>((set) => {
  let unsubscribe: (() => void) | null = null;

  onAuthStateChanged(auth, (user) => {
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch (e) {}
      unsubscribe = null;
    }

    if (user) {
      unsubscribe = listenPricingSettings(
        user.uid,
        (settings) => {
          set({ settings });
        },
        (err) => {
          if (err && err.code === "permission-denied") {
            set({ settings: DEFAULT_PRICING_SETTINGS });
          }
        }
      );
    } else {
      set({ settings: DEFAULT_PRICING_SETTINGS });
    }
  });

  return {
    settings: DEFAULT_PRICING_SETTINGS,

    updateSettings: async (settings) => {
      await savePricingSettings(settings);
    },
  };
});
