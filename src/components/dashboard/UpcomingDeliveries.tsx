import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, ArrowRight } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { getDeadlineStatus, getDaysUntilDeadline } from '@/types/order';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function UpcomingDeliveries() {
  const orders = useOrderStore((state) => state.orders);

  const upcomingOrders = orders
    .filter((o) => o.status !== 'delivered')
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 3);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Package className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-lg">Próximas Entregas</h3>
        </div>
        <Link to="/producao">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Ver todas
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {upcomingOrders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma entrega pendente
          </p>
        ) : (
          upcomingOrders.map((order, index) => {
            const status = getDeadlineStatus(order.deadline);
            const daysLeft = getDaysUntilDeadline(order.deadline);

            return (
              <div
                key={order.id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl transition-all animate-fade-in',
                  status === 'urgent' && 'bg-alert-urgent-bg',
                  status === 'warning' && 'bg-alert-warning-bg',
                  status === 'ok' && 'bg-muted/50'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm',
                      status === 'urgent' && 'bg-alert-urgent text-white',
                      status === 'warning' && 'bg-alert-warning text-white',
                      status === 'ok' && 'bg-alert-ok text-white'
                    )}
                  >
                    {daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {order.clientName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {order.productDescription}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-foreground">
                    {format(order.deadline, 'dd MMM', { locale: ptBR })}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      status === 'urgent' && 'text-alert-urgent',
                      status === 'warning' && 'text-alert-warning',
                      status === 'ok' && 'text-alert-ok'
                    )}
                  >
                    {daysLeft < 0
                      ? 'Atrasado!'
                      : daysLeft === 0
                      ? 'Hoje!'
                      : `${daysLeft} dias`}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
