/**
 * Minimal event bus to fire "goal reached" from the Zustand store
 * (which runs outside React) into the UI layer.
 */

type GoalReachedPayload = {
  orderPrice: number;  // price of the order that pushed revenue over the goal
  totalRevenue: number;
  goal: number;
};

type GoalReachedHandler = (payload: GoalReachedPayload) => void;

const handlers: GoalReachedHandler[] = [];

export const goalEvents = {
  on(handler: GoalReachedHandler) {
    handlers.push(handler);
    return () => {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    };
  },
  emit(payload: GoalReachedPayload) {
    handlers.forEach((h) => h(payload));
  },
};
