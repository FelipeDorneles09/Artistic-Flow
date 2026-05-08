import { useMemo } from 'react';
import { Wallet, ArrowRight } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { STATUS_LABELS, OrderStatus } from '@/types/order';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Partial<Record<OrderStatus, { color: string; bar: string }>> = {
  finishing:  { color: 'text-orange-600',  bar: 'bg-orange-400' },
  production: { color: 'text-primary',     bar: 'bg-primary' },
  ready:      { color: 'text-alert-ok',    bar: 'bg-alert-ok' },
  to_buy:     { color: 'text-alert-warning', bar: 'bg-alert-warning' },
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function PendingRevenue() {
  const orders = useOrderStore((state) => state.orders);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'delivered'),
    [orders]
  );

  const totalPending = useMemo(
    () => activeOrders.reduce((s, o) => s + o.price, 0),
    [activeOrders]
  );

  // Group by status with total value
  const byStatus = useMemo(() => {
    const statuses: OrderStatus[] = ['to_buy', 'production', 'finishing', 'ready'];
    return statuses.map((status) => {
      const subset = activeOrders.filter((o) => o.status === status);
      return {
        status,
        label: STATUS_LABELS[status],
        count: subset.length,
        value: subset.reduce((s, o) => s + o.price, 0),
      };
    }).filter((s) => s.count > 0);
  }, [activeOrders]);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-none">A Receber</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Valor em produção ativa</p>
          </div>
        </div>
        <Link to="/producao">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Ver tudo
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Total highlight */}
      <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
        <p className="text-xs text-muted-foreground mb-0.5">Total em aberto</p>
        <p className="text-2xl font-bold text-primary">{fmt(totalPending)}</p>
        <p className="text-xs text-muted-foreground">{activeOrders.length} pedido{activeOrders.length !== 1 ? 's' : ''} ativos</p>
      </div>

      {byStatus.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          Nenhum pedido ativo no momento.
        </p>
      ) : (
        <div className="space-y-3">
          {byStatus.map(({ status, label, count, value }) => {
            const cfg = STATUS_CONFIG[status];
            const pct = totalPending > 0 ? (value / totalPending) * 100 : 0;
            return (
              <div key={status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-semibold', cfg?.color)}>
                      {label}
                    </span>
                    <span className="text-muted-foreground text-xs">({count})</span>
                  </span>
                  <span className="font-semibold text-xs">{fmt(value)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', cfg?.bar ?? 'bg-primary')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
