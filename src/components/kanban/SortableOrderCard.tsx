import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Order } from '@/types/order';
import { OrderCard } from '@/components/OrderCard';
import { cn } from '@/lib/utils';

interface SortableOrderCardProps {
  order: Order;
  onEdit?: (order: Order) => void;
}

export function SortableOrderCard({ order, onEdit }: SortableOrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    // avoid the default layout animation while the item is being dragged
    // this prevents a "returning ghost" when the card is removed from the
    // original list as soon as the status updates
    transition: isDragging ? 'none' : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'transition-opacity',
        isDragging && 'opacity-50'
      )}
    >
      <OrderCard order={order} onEdit={onEdit} />
    </div>
  );
}
