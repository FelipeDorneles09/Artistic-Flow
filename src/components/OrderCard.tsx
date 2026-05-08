import { useState } from 'react';
import { Order, getDeadlineStatus, getDaysUntilDeadline, STATUS_LABELS } from '@/types/order';
import { MessageCircle, Clock, Edit2, Trash2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useOrderStore } from '@/store/orderStore';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OrderCardProps {
  order: Order;
  showActions?: boolean;
  onEdit?: (order: Order) => void;
}

export function OrderCard({ order, showActions = true, onEdit }: OrderCardProps) {
  const { toast } = useToast();
  const deleteOrder = useOrderStore((state) => state.deleteOrder);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const deadlineStatus = getDeadlineStatus(order.deadline);
  const daysLeft = getDaysUntilDeadline(order.deadline);

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá ${order.clientName}! Seu pedido "${order.productDescription}" está em ${STATUS_LABELS[order.status].toLowerCase()}. Em breve entraremos em contato!`
    );
    window.open(`https://wa.me/${order.clientPhone}?text=${message}`, '_blank');
  };

  const handleDelete = async () => {
    try {
      await deleteOrder(order.id);
      toast({
        title: 'Pedido deletado!',
        description: `Pedido de ${order.clientName} foi removido.`,
      });
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Erro ao deletar pedido', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar o pedido. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const handleFinalize = async () => {
    try {
      await updateOrderStatus(order.id, 'delivered');
      toast({
        title: 'Pedido finalizado! 🎉',
        description: `Pedido de ${order.clientName} marcado como entregue.`,
      });
      setShowFinalizeDialog(false);
    } catch (err) {
      toast({ title: 'Erro ao finalizar', variant: 'destructive' });
    }
  };

  return (
    <>
      <div className="kanban-card group">
      {/* Reference Image */}
      {order.referenceImage && (
        <div className="relative h-24 -mx-4 -mt-4 mb-3 rounded-t-xl overflow-hidden">
          <img
            src={order.referenceImage}
            alt={order.productDescription}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
        </div>
      )}

      {/* Deadline Badge */}
      <div
        className={cn(
          'status-badge mb-2',
          deadlineStatus === 'urgent' && 'status-urgent animate-pulse-urgent',
          deadlineStatus === 'warning' && 'status-warning',
          deadlineStatus === 'ok' && 'status-ok'
        )}
      >
        <Clock className="h-3 w-3" />
        {daysLeft < 0
          ? `${Math.abs(daysLeft)} dias atrasado`
          : daysLeft === 0
          ? 'Hoje!'
          : `${daysLeft} dias`}
      </div>

      {/* Client Name */}
      <h4 className="font-semibold text-foreground mb-1">{order.clientName}</h4>

      {/* Product Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {order.productDescription}
      </p>

      {/* Price and Actions */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <span className="font-semibold text-primary">
          R$ {order.price.toFixed(2)}
        </span>

        {showActions && (
          <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            {order.status !== 'to_buy' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:bg-muted lg:hidden"
                onClick={() => {
                  const stages: OrderStatus[] = ['to_buy', 'production', 'finishing', 'ready'];
                  const currentIndex = stages.indexOf(order.status);
                  if (currentIndex > 0) {
                    useOrderStore.getState().updateOrderStatus(order.id, stages[currentIndex - 1]);
                  }
                }}
                title="Voltar status"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {order.status !== 'ready' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary hover:bg-primary/10 lg:hidden"
                onClick={() => {
                  const stages: OrderStatus[] = ['to_buy', 'production', 'finishing', 'ready'];
                  const currentIndex = stages.indexOf(order.status);
                  if (currentIndex < stages.length - 1) {
                    useOrderStore.getState().updateOrderStatus(order.id, stages[currentIndex + 1]);
                  }
                }}
                title="Avançar status"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            {order.status === 'ready' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                onClick={() => setShowFinalizeDialog(true)}
                title="Finalizar pedido"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-alert-ok hover:bg-alert-ok-bg"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => onEdit?.(order)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deletar Pedido</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja deletar o pedido de <strong>{order.clientName}</strong>? Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-3">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Deletar
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finalizar Pedido</AlertDialogTitle>
          <AlertDialogDescription>
            Confirmar entrega do pedido de <strong>{order.clientName}</strong>?
            Ele será movido para o histórico de finalizados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-3">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFinalize}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Confirmar Entrega
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
