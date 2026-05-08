import { useDroppable, useDndContext } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Order, OrderStatus, STATUS_LABELS, getDeadlineStatus } from '@/types/order';
import { SortableOrderCard } from './SortableOrderCard';
import { cn } from '@/lib/utils';
import { ShoppingBag, Hammer, Sparkles, Package } from 'lucide-react';

interface KanbanColumnProps {
  status: OrderStatus;
  orders: Order[];
  onEditOrder?: (order: Order) => void;
}

const STATUS_ICONS = {
  to_buy: ShoppingBag,
  production: Hammer,
  finishing: Sparkles,
  ready: Package,
  delivered: Package,
};

const STATUS_COLORS = {
  to_buy: 'bg-alert-warning/10 border-alert-warning/30',
  production: 'bg-primary/10 border-primary/30',
  finishing: 'bg-accent border-accent-foreground/20',
  ready: 'bg-alert-ok/10 border-alert-ok/30',
  delivered: 'bg-muted border-border',
};

export function KanbanColumn({ status, orders, onEditOrder }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });
  
  const { over } = useDndContext();
  const isDraggedOver = over?.id === status || orders.some((o) => o.id === over?.id);

  const Icon = STATUS_ICONS[status];
  const urgentCount = orders.filter(
    (o) => getDeadlineStatus(o.deadline) === 'urgent'
  ).length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-2xl border-2 border-dashed p-4 min-h-[600px] transition-all duration-200',
        STATUS_COLORS[status],
        isDraggedOver && 'border-primary bg-primary/5 scale-[1.01] shadow-md'
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card shadow-soft">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">
            {STATUS_LABELS[status]}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-alert-urgent text-white text-xs font-medium animate-pulse-urgent">
              {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-sm font-medium shadow-soft">
            {orders.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <SortableContext
        items={orders.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {orders.map((order) => (
            <SortableOrderCard key={order.id} order={order} onEdit={onEditOrder} />
          ))}
        </div>
      </SortableContext>

      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Icon className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Nenhum pedido</p>
        </div>
      )}
    </div>
  );
}
