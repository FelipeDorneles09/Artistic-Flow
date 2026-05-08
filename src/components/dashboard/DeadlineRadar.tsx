import { AlertTriangle, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { getDeadlineStatus, STATUS_LABELS } from '@/types/order';
import { cn } from '@/lib/utils';

export function DeadlineRadar() {
  const orders = useOrderStore((state) => state.orders);
  const activeOrders = orders.filter((o) => o.status !== 'delivered');

  const urgentCount = activeOrders.filter(
    (o) => getDeadlineStatus(o.deadline) === 'urgent'
  ).length;
  const warningCount = activeOrders.filter(
    (o) => getDeadlineStatus(o.deadline) === 'warning'
  ).length;
  const okCount = activeOrders.filter(
    (o) => getDeadlineStatus(o.deadline) === 'ok'
  ).length;

  const total = urgentCount + warningCount + okCount;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <h3 className="font-semibold text-lg">Radar de Prazos</h3>
      </div>

      <div className="space-y-3">
        {/* Urgent */}
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-xl transition-all',
            urgentCount > 0
              ? 'bg-alert-urgent-bg shadow-glow-urgent'
              : 'bg-muted/50'
          )}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={cn(
                'h-5 w-5',
                urgentCount > 0
                  ? 'text-alert-urgent animate-pulse-urgent'
                  : 'text-muted-foreground'
              )}
            />
            <div>
              <p
                className={cn(
                  'font-medium',
                  urgentCount > 0 ? 'text-alert-urgent' : 'text-muted-foreground'
                )}
              >
                Urgente
              </p>
              <p className="text-xs text-muted-foreground">Menos de 3 dias</p>
            </div>
          </div>
          <span
            className={cn(
              'text-2xl font-bold',
              urgentCount > 0 ? 'text-alert-urgent' : 'text-muted-foreground'
            )}
          >
            {urgentCount}
          </span>
        </div>

        {/* Warning */}
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-xl transition-all',
            warningCount > 0 ? 'bg-alert-warning-bg' : 'bg-muted/50'
          )}
        >
          <div className="flex items-center gap-3">
            <TrendingUp
              className={cn(
                'h-5 w-5',
                warningCount > 0
                  ? 'text-alert-warning'
                  : 'text-muted-foreground'
              )}
            />
            <div>
              <p
                className={cn(
                  'font-medium',
                  warningCount > 0 ? 'text-alert-warning' : 'text-muted-foreground'
                )}
              >
                Atenção
              </p>
              <p className="text-xs text-muted-foreground">3 a 7 dias</p>
            </div>
          </div>
          <span
            className={cn(
              'text-2xl font-bold',
              warningCount > 0 ? 'text-alert-warning' : 'text-muted-foreground'
            )}
          >
            {warningCount}
          </span>
        </div>

        {/* OK */}
        <div
          className={cn(
            'flex items-center justify-between p-3 rounded-xl transition-all',
            okCount > 0 ? 'bg-alert-ok-bg' : 'bg-muted/50'
          )}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2
              className={cn(
                'h-5 w-5',
                okCount > 0 ? 'text-alert-ok' : 'text-muted-foreground'
              )}
            />
            <div>
              <p
                className={cn(
                  'font-medium',
                  okCount > 0 ? 'text-alert-ok' : 'text-muted-foreground'
                )}
              >
                Tranquilo
              </p>
              <p className="text-xs text-muted-foreground">Mais de 7 dias</p>
            </div>
          </div>
          <span
            className={cn(
              'text-2xl font-bold',
              okCount > 0 ? 'text-alert-ok' : 'text-muted-foreground'
            )}
          >
            {okCount}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          <span className="font-semibold text-foreground">{total}</span> pedidos
          ativos no momento
        </p>
      </div>
    </div>
  );
}
