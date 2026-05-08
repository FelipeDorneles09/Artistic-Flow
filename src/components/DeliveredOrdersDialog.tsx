import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, User, Package, DollarSign, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useOrderStore } from '@/store/orderStore';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function DeliveredOrdersDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  // Select the stable orders array; filter outside the selector to avoid reference churn
  const orders = useOrderStore((state) => state.orders);
  const delivered = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);

  const totalRevenue = delivered.reduce((sum, o) => sum + o.price, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2 relative", className)}>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Finalizados
          {delivered.length > 0 && (
            <span className="ml-1 bg-emerald-600 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
              {delivered.length}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Pedidos Finalizados
          </DialogTitle>

          {/* Summary */}
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
              <Star className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-sm font-medium">{delivered.length} pedido{delivered.length !== 1 ? 's' : ''} entregue{delivered.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-3 py-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-sm font-medium">{formatCurrency(totalRevenue)} em receita</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {delivered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <CheckCircle2 className="h-10 w-10 opacity-30" />
              <p>Nenhum pedido finalizado ainda.</p>
              <p className="text-xs">Pedidos marcados como entregues aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {delivered.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{order.clientName}</span>
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-200">
                          Entregue
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{order.productDescription}</p>
                    </div>
                    <span className="font-bold text-emerald-600 shrink-0 text-sm">
                      {formatCurrency(order.price)}
                    </span>
                  </div>

                  {order.referenceImage && (
                    <div className="w-full h-32 mb-3 rounded-lg overflow-hidden border border-border">
                      <img
                        src={order.referenceImage}
                        alt="Referência"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Prazo: {formatDate(order.deadline)}
                    </span>
                    {order.clientPhone && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.clientPhone}
                      </span>
                    )}
                    {order.materials?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {order.materials.length} insumo{order.materials.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Criado em: {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Materials list (collapsed) */}
                  {order.materials?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
                      {order.materials.map((m) => (
                        <span
                          key={m.id}
                          className="text-xs bg-muted rounded-full px-2 py-0.5 text-muted-foreground"
                        >
                          {m.name} × {m.quantity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
