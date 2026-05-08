import { loadStripe } from "@stripe/stripe-js";

// Trial period in days
export const TRIAL_DAYS = 7;

// Initialize Stripe
let stripePromise: ReturnType<typeof loadStripe> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Redirect to Stripe Checkout using Payment Link
export const redirectToCheckout = async (userEmail: string, userId: string) => {
  const paymentLink = import.meta.env.VITE_PAYMENT_LINK as string | undefined;
  if (!paymentLink) {
    throw new Error(
      "VITE_PAYMENT_LINK is not defined in the environment variables",
    );
  }

  const url = new URL(paymentLink);
  url.searchParams.set("prefilled_email", userEmail);
  url.searchParams.set("client_reference_id", userId);

  window.location.href = url.toString();
};
