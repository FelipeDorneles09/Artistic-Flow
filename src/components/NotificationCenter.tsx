import { useState, useMemo } from 'react';
import { Bell, AlertTriangle, Clock, Package, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrderStore } from '@/store/orderStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { getDeadlineStatus, getDaysUntilDeadline } from '@/types/order';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationCenter() {
  const orders = useOrderStore((state) => state.orders);
  const inventoryItems = useInventoryStore((state) => state.items);
  const [open, setOpen] = useState(false);

  // Derive notifications
  const notifications = useMemo(() => {
    const list: { id: string; type: 'deadline' | 'stock'; title: string; description: string; priority: 'high' | 'medium'; icon: any }[] = [];

    // 1. Check for urgent deadlines
    orders.filter(o => o.status !== 'delivered').forEach(order => {
      const status = getDeadlineStatus(order.deadline);
      const days = getDaysUntilDeadline(order.deadline);

      if (status === 'urgent') {
        list.push({
          id: `deadline-${order.id}`,
          type: 'deadline',
          title: 'Prazo Urgente',
          description: `${order.clientName}: Entrega em ${days === 0 ? 'Hoje' : days + ' dias'}!`,
          priority: 'high',
          icon: AlertTriangle
        });
      } else if (status === 'warning') {
        list.push({
          id: `deadline-${order.id}`,
          type: 'deadline',
          title: 'Prazo Próximo',
          description: `${order.clientName}: Entrega em ${days} dias.`,
          priority: 'medium',
          icon: Clock
        });
      }
    });

    // 2. Check for low stock
    inventoryItems.forEach(item => {
      if (item.quantity < item.minQuantity) {
        list.push({
          id: `stock-${item.id}`,
          type: 'stock',
          title: 'Estoque Baixo',
          description: `${item.name}: Apenas ${item.quantity} ${item.unit} restantes.`,
          priority: 'medium',
          icon: Package
        });
      }
    });

    return list.sort((a, b) => (a.priority === 'high' ? -1 : 1));
  }, [orders, inventoryItems]);

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-sidebar-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-alert-urgent text-[10px] font-bold text-white border-2 border-sidebar">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <span className="text-xs text-muted-foreground">{unreadCount} pendentes</span>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4 text-center">
              <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">Tudo em ordem!</p>
              <p className="text-xs">Nenhuma notificação no momento.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div key={n.id} className="p-4 flex gap-3 hover:bg-muted/50 transition-colors group">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    n.priority === 'high' ? "bg-alert-urgent-bg text-alert-urgent" : "bg-primary/10 text-primary"
                  )}>
                    <n.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn(
                      "text-sm font-medium leading-none",
                      n.priority === 'high' && "text-alert-urgent"
                    )}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {n.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
