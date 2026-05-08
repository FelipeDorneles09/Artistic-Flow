import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { TRIAL_DAYS } from "@/lib/stripe";

export interface UserSubscription {
  status: "trial" | "active" | "expired" | "none";
  trialStartDate?: Date;
  trialEndDate?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    () => {
      try {
        const cached = localStorage.getItem("subscriptionStatus");
        if (cached) return { status: cached as UserSubscription["status"] };
      } catch (e) {
        // ignore (e.g., SSR)
      }
      return null;
    },
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    let firstSnapshot = true;

    const unsubscribe = onSnapshot(
      userRef,
      async (snap) => {
        try {
          if (!snap.exists()) {
            // Create new user with trial on first time
            if (firstSnapshot) {
              const trialStart = new Date();
              const trialEnd = new Date();
              trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

              await setDoc(userRef, {
                email: user.email,
                createdAt: serverTimestamp(),
                trialStartDate: trialStart,
                trialEndDate: trialEnd,
              });

              setSubscription({
                status: "trial",
                trialStartDate: trialStart,
                trialEndDate: trialEnd,
              });
            }
          } else {
            const data = snap.data();
            const trialEndDate =
              data.trialEndDate?.toDate?.() ?? data.trialEndDate;
            const currentPeriodEnd =
              data.currentPeriodEnd?.toDate?.() ?? data.currentPeriodEnd;

            let status: UserSubscription["status"] = "none";
            if (
              data.stripeSubscriptionId &&
              currentPeriodEnd &&
              new Date(currentPeriodEnd) > new Date()
            ) {
              status = "active";
            } else if (trialEndDate) {
              status =
                new Date(trialEndDate) > new Date() ? "trial" : "expired";
            }

            setSubscription({
              status,
              trialStartDate:
                data.trialStartDate?.toDate?.() ?? data.trialStartDate,
              trialEndDate: trialEndDate ? new Date(trialEndDate) : undefined,
              stripeCustomerId: data.stripeCustomerId,
              stripeSubscriptionId: data.stripeSubscriptionId,
              currentPeriodEnd: currentPeriodEnd
                ? new Date(currentPeriodEnd)
                : undefined,
            });

            try {
              localStorage.setItem("subscriptionStatus", status);
            } catch (e) {
              /* ignore */
            }
          }
        } catch (err) {
          console.error("Error processing subscription snapshot:", err);
          setSubscription({ status: "none" });
        } finally {
          // After processing the first snapshot (success or error), clear loading
          if (firstSnapshot) {
            setLoading(false);
            firstSnapshot = false;
          }
        }
      },
      (error) => {
        console.error("Subscription snapshot error:", error);
        setSubscription({ status: "none" });
        setLoading(false);
        firstSnapshot = false;
      },
    );

    return () => unsubscribe();
  }, [user]);

  const hasAccess =
    subscription?.status === "trial" || subscription?.status === "active";

  const daysRemaining = subscription?.trialEndDate
    ? Math.max(
        0,
        Math.ceil(
          (subscription.trialEndDate.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  return { subscription, loading, hasAccess, daysRemaining };
}
