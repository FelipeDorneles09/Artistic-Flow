import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useOrderStore } from '@/store/orderStore';
import { Order, OrderStatus, STATUS_COLUMNS, STATUS_LABELS } from '@/types/order';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { OrderCard } from '@/components/OrderCard';
import { NewOrderDialog } from '@/components/NewOrderDialog';
import { DeliveredOrdersDialog } from '@/components/DeliveredOrdersDialog';
import { useLocation, useNavigate } from 'react-router-dom';
import { Kanban as KanbanIcon, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Producao() {
  const { toast } = useToast();
  const orders = useOrderStore((state) => state.orders);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId) {
      const orderToEdit = orders.find((o) => o.id === editId);
      if (orderToEdit) {
        setEditingOrder(orderToEdit);
        setIsDialogOpen(true);
      }
    }
  }, [location.search, orders]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const order = orders.find((o) => o.id === event.active.id);
    if (order) setActiveOrder(order);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column directly
    if (STATUS_COLUMNS.includes(overId as OrderStatus)) {
      updateOrderStatus(orderId, overId as OrderStatus);
      return;
    }

    // If dropped on another card, find which column that card belongs to
    const targetOrder = orders.find((o) => o.id === overId);
    if (targetOrder) {
      updateOrderStatus(orderId, targetOrder.status);
    }
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingOrder(null);
      // remove edit param from URL when closing
      navigate('/producao', { replace: true });
    }
  };

  const exportToCSV = () => {
    if (orders.length === 0) return;

    let csvContent = "Cliente;Produto;Status;Prazo;Preço;Telefone\n";

    orders.forEach(order => {
      const client = `"${order.clientName.replace(/"/g, '""')}"`;
      const product = `"${order.productDescription.replace(/"/g, '""')}"`;
      const status = `"${STATUS_LABELS[order.status]}"`;
      const deadline = order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : '';
      const price = order.price.toString().replace('.', ',');
      const phone = `"${order.clientPhone || ''}"`;
      
      csvContent += `${client};${product};${status};${deadline};${price};${phone}\n`;
    });

    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "pedidos-artflow.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Pedidos exportados!',
      description: 'O arquivo .csv foi salvo.',
    });
  };

  return (
    <div className="max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <KanbanIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Produção</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Arraste os pedidos entre as colunas para atualizar o status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DeliveredOrdersDialog />
          <Button
            variant="outline"
            onClick={exportToCSV}
            className="gap-2 w-full md:w-auto"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="gap-2 w-full md:w-auto"
          >
            <Plus className="h-4 w-4" />
            Novo Pedido
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="pb-4">
          {/* Mobile View: Tabs */}
          <div className="lg:hidden">
            <Tabs defaultValue={STATUS_COLUMNS[0]} className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-6">
                {STATUS_COLUMNS.map((status) => (
                  <TabsTrigger key={status} value={status} className="text-[10px] sm:text-xs">
                    {STATUS_LABELS[status]}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {STATUS_COLUMNS.map((status) => {
                const columnOrders = orders
                  .filter((o) => o.status === status)
                  .sort((a, b) => {
                    const dateA = a.deadline instanceof Date ? a.deadline : new Date(a.deadline);
                    const dateB = b.deadline instanceof Date ? b.deadline : new Date(b.deadline);
                    return dateA.getTime() - dateB.getTime();
                  });

                return (
                  <TabsContent key={status} value={status} className="mt-0">
                    <KanbanColumn
                      status={status}
                      orders={columnOrders}
                      onEditOrder={handleEditOrder}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>

          {/* Desktop View: Grid */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-4">
            {STATUS_COLUMNS.map((status) => {
              const columnOrders = orders
                .filter((o) => o.status === status)
                .sort((a, b) => {
                  const dateA = a.deadline instanceof Date ? a.deadline : new Date(a.deadline);
                  const dateB = b.deadline instanceof Date ? b.deadline : new Date(b.deadline);
                  return dateA.getTime() - dateB.getTime();
                });
                
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  orders={columnOrders}
                  onEditOrder={handleEditOrder}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 0 }}>
          {activeOrder && (
            <div className="opacity-90 rotate-3">
              <OrderCard order={activeOrder} showActions={false} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <NewOrderDialog 
        open={isDialogOpen} 
        onOpenChange={handleCloseDialog}
        editingOrder={editingOrder}
      />
    </div>
  );
}
