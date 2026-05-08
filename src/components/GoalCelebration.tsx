import { useEffect, useState, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { goalEvents } from '@/lib/goalEvents';
import { Trophy, X, TrendingUp } from 'lucide-react';

interface GoalPayload {
  orderPrice: number;
  totalRevenue: number;
  goal: number;
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function GoalCelebration() {
  const [payload, setPayload] = useState<GoalPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
      setPayload(null);
    }, 400);
  }, []);

  const fireConfetti = useCallback(() => {
    const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f97316'];

    // Left burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.1, y: 0.3 },
      colors,
      zIndex: 9999,
    });

    // Right burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.9, y: 0.3 },
      colors,
      zIndex: 9999,
    });

    // Center stars
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { x: 0.5, y: 0.2 },
        shapes: ['star'],
        colors,
        zIndex: 9999,
      });
    }, 200);

    // Trailing rain
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 120,
        origin: { x: 0.5, y: 0 },
        colors,
        startVelocity: 30,
        gravity: 0.8,
        zIndex: 9999,
      });
    }, 500);
  }, []);

  useEffect(() => {
    const off = goalEvents.on((p) => {
      // Clear any pending auto-dismiss
      if (timerRef.current) clearTimeout(timerRef.current);

      setPayload(p);
      setExiting(false);
      setVisible(true);

      // Fire confetti after a tiny delay so the banner animation plays first
      setTimeout(fireConfetti, 150);

      // Auto-dismiss after 8 seconds
      timerRef.current = setTimeout(dismiss, 8000);
    });

    return () => {
      off();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, fireConfetti]);

  if (!visible || !payload) return null;

  const percent = Math.round((payload.totalRevenue / payload.goal) * 100);

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[9998] flex justify-center
        pointer-events-none
      `}
    >
      <div
        className={`
          pointer-events-auto
          mt-4 mx-4 max-w-lg w-full
          ${exiting ? 'animate-goal-out' : 'animate-goal-in'}
        `}
      >
        {/* Glowing card */}
        <div
          className="
            relative overflow-hidden
            rounded-2xl border border-amber-400/60
            bg-gradient-to-br from-amber-50 via-yellow-50 to-emerald-50
            dark:from-amber-950/80 dark:via-yellow-950/70 dark:to-emerald-950/80
            shadow-2xl shadow-amber-500/30
            p-5
          "
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />

          {/* Dismiss button */}
          <button
            onClick={dismiss}
            className="
              absolute top-3 right-3 h-7 w-7 flex items-center justify-center
              rounded-full bg-black/10 hover:bg-black/20 transition-colors
              text-foreground/70
            "
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            {/* Trophy icon with glow */}
            <div className="
              flex-shrink-0 h-14 w-14 rounded-2xl
              bg-amber-400/20 border border-amber-400/50
              flex items-center justify-center
              shadow-inner
              animate-trophy-bounce
            ">
              <Trophy className="h-7 w-7 text-amber-500" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-0.5">
                🎉 Meta Batida!
              </p>
              <h2 className="text-xl font-extrabold text-foreground leading-tight">
                Parabéns! Você atingiu a meta do mês!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Este pedido de <span className="font-semibold text-emerald-600">{fmt(payload.orderPrice)}</span> fez
                você cruzar a meta de <span className="font-semibold">{fmt(payload.goal)}</span>.
              </p>

              {/* Progress bar */}
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    Faturamento mensal
                  </span>
                  <span className="font-bold text-emerald-600">{percent}% da meta</span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-1000 animate-progress-fill"
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">R$ 0</span>
                  <span className="font-semibold text-foreground">{fmt(payload.totalRevenue)}</span>
                  <span className="text-muted-foreground">{fmt(payload.goal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
