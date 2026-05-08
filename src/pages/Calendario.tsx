import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday as dateFnsIsToday,
  isBefore, startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, Package, TrendingUp,
} from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { Order, STATUS_LABELS, getDeadlineStatus } from '@/types/order';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  to_buy:    'bg-alert-warning',
  production:'bg-blue-500',
  finishing: 'bg-purple-500',
  ready:     'bg-alert-ok',
  delivered: 'bg-emerald-600',
};

const DEADLINE_BORDER: Record<string, string> = {
  urgent:  'border-l-4 border-alert-urgent bg-alert-urgent/10',
  warning: 'border-l-4 border-alert-warning bg-alert-warning/10',
  ok:      'border-l-4 border-alert-ok bg-alert-ok/10',
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function Calendario() {
  const orders = useOrderStore((state) => state.orders);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const emptyDays = Array(startDay).fill(null);
  const today = startOfDay(new Date());

  /* Orders placed on this day (deadline for active, deliveredAt for delivered) */
  const getPendingForDay = (day: Date) =>
    orders.filter((o) => o.status !== 'delivered' && isSameDay(o.deadline, day));

  const getDeliveredForDay = (day: Date) =>
    orders.filter((o) => {
      if (o.status !== 'delivered') return false;
      const d = o.deliveredAt
        ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
        : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
      return isSameDay(d, day);
    });

  const getAllForDay = (day: Date) => [...getPendingForDay(day), ...getDeliveredForDay(day)];

  const openDialog = (day: Date) => {
    setSelectedOrders(getAllForDay(day));
    setSelectedDate(day);
    setIsDialogOpen(true);
  };

  /* Month summary stats */
  const monthOrders = orders.filter((o) => {
    const d = o.deadline instanceof Date ? o.deadline : new Date(o.deadline);
    return d >= monthStart && d <= monthEnd && o.status !== 'delivered';
  });
  const monthDelivered = orders.filter((o) => {
    if (o.status !== 'delivered') return false;
    const d = o.deliveredAt
      ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
      : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
    return d >= monthStart && d <= monthEnd;
  });
  const monthRevenue = monthDelivered.reduce((s, o) => s + o.price, 0);
  const urgentCount = monthOrders.filter((o) => getDeadlineStatus(o.deadline) === 'urgent').length;

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Calendário</h1>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">
              Visualize entregas, pedidos entregues e o fluxo do mês.
            </p>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Clock,        label: 'Pendentes',  value: monthOrders.length,    color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40' },
            { icon: AlertTriangle,label: 'Urgentes',   value: urgentCount,           color: 'text-alert-urgent', bg: 'bg-alert-urgent-bg' },
            { icon: CheckCircle2, label: 'Entregues',  value: monthDelivered.length, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
            { icon: TrendingUp,   label: 'Faturado',   value: fmt(monthRevenue),     color: 'text-primary',     bg: 'bg-primary/5' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={cn('rounded-2xl p-4 flex items-center gap-3 shadow-soft', bg)}>
              <Icon className={cn('h-5 w-5 shrink-0', color)} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn('text-lg font-bold leading-tight', color)}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Card */}
        <div className="bg-card rounded-2xl shadow-soft p-5">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-5 pb-5 border-b border-border text-sm">
            {[
              { dot: 'bg-alert-urgent', label: 'Urgente' },
              { dot: 'bg-alert-warning', label: 'Atenção' },
              { dot: 'bg-alert-ok', label: 'No prazo' },
              { dot: 'bg-emerald-600', label: 'Entregue', ring: true },
            ].map(({ dot, label, ring }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn('h-2.5 w-2.5 rounded-full', dot, ring && 'ring-2 ring-offset-1 ring-emerald-600/40')} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {emptyDays.map((_, i) => <div key={`e-${i}`} />)}

            {daysInMonth.map((day) => {
              const pending = getPendingForDay(day);
              const delivered = getDeliveredForDay(day);
              const all = [...pending, ...delivered];
              const isToday = dateFnsIsToday(day);
              const isPast = isBefore(startOfDay(day), today) && !isToday;
              const hasOverload = pending.length >= 3;

              /* dominant urgency for background */
              let urgency: 'urgent' | 'warning' | 'ok' | null = null;
              if (pending.length > 0) {
                if (pending.some((o) => getDeadlineStatus(o.deadline) === 'urgent')) urgency = 'urgent';
                else if (pending.some((o) => getDeadlineStatus(o.deadline) === 'warning')) urgency = 'warning';
                else urgency = 'ok';
              }

              return (
                <Tooltip key={day.toISOString()} delayDuration={120}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => openDialog(day)}
                      className={cn(
                        'min-h-[72px] rounded-xl p-2 flex flex-col gap-1 transition-all cursor-pointer border border-transparent',
                        isPast ? 'bg-muted/20 opacity-60' : 'bg-muted/30 hover:bg-muted/50',
                        isToday && 'ring-2 ring-primary ring-offset-1 bg-primary/5',
                        hasOverload && 'border-alert-urgent/40',
                      )}
                    >
                      {/* Day number */}
                      <span className={cn(
                        'text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full',
                        isToday && 'bg-primary text-primary-foreground',
                        !isToday && isPast && 'text-muted-foreground',
                        !isToday && !isPast && 'text-foreground',
                      )}>
                        {format(day, 'd')}
                      </span>

                      {/* Dots for pending orders */}
                      {pending.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pending.slice(0, 4).map((order) => {
                            const s = getDeadlineStatus(order.deadline);
                            return (
                              <div
                                key={order.id}
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  s === 'urgent' && 'bg-alert-urgent',
                                  s === 'warning' && 'bg-alert-warning',
                                  s === 'ok' && 'bg-alert-ok',
                                )}
                              />
                            );
                          })}
                          {pending.length > 4 && (
                            <span className="text-[9px] text-muted-foreground leading-none self-center">
                              +{pending.length - 4}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Green check strip for delivered */}
                      {delivered.length > 0 && (
                        <div className="flex items-center gap-1 mt-auto">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="text-[10px] text-emerald-600 font-semibold leading-none">
                            {delivered.length}
                          </span>
                        </div>
                      )}

                      {/* Overload warning icon */}
                      {hasOverload && (
                        <AlertTriangle className="h-3 w-3 text-alert-urgent self-end mt-auto" />
                      )}
                    </div>
                  </TooltipTrigger>

                  {/* Hover tooltip — only shows if day has orders */}
                  {all.length > 0 && (
                    <TooltipContent side="top" className="p-0 border-none bg-transparent shadow-none">
                      <div className="bg-card rounded-xl border border-border shadow-lg p-3 min-w-[200px] max-w-[260px] space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {format(day, "d 'de' MMMM", { locale: ptBR })}
                        </p>
                        {pending.map((o) => {
                          const s = getDeadlineStatus(o.deadline);
                          return (
                            <div key={o.id} className={cn('rounded-lg px-2 py-1.5 text-xs flex gap-2 items-start', DEADLINE_BORDER[s])}>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{o.clientName}</p>
                                <p className="text-muted-foreground truncate">{o.productDescription}</p>
                              </div>
                              <span className="font-bold shrink-0">{fmt(o.price)}</span>
                            </div>
                          );
                        })}
                        {delivered.map((o) => (
                          <div key={o.id} className="rounded-lg px-2 py-1.5 text-xs flex gap-2 items-start border-l-4 border-emerald-500 bg-emerald-500/10">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate text-emerald-700">{o.clientName}</p>
                              <p className="text-muted-foreground truncate">{o.productDescription}</p>
                            </div>
                            <span className="font-bold text-emerald-700 shrink-0">{fmt(o.price)}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Day Orders Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {selectedDate ? format(selectedDate, "d 'de' MMMM yyyy", { locale: ptBR }) : 'Pedidos'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
              {selectedOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">Nenhum pedido neste dia.</p>
              ) : (
                selectedOrders.map((order) => {
                  const isDelivered = order.status === 'delivered';
                  const deadlineStatus = isDelivered ? 'ok' : getDeadlineStatus(order.deadline);
                  return (
                    <div
                      key={order.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-xl border transition-all',
                        isDelivered
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : deadlineStatus === 'urgent'
                          ? 'bg-alert-urgent/10 border-alert-urgent/30'
                          : deadlineStatus === 'warning'
                          ? 'bg-alert-warning/10 border-alert-warning/30'
                          : 'bg-alert-ok/10 border-alert-ok/30'
                      )}
                    >
                      {/* Status dot */}
                      <div className={cn(
                        'h-2.5 w-2.5 rounded-full mt-1.5 shrink-0',
                        STATUS_COLORS[order.status] ?? 'bg-muted',
                      )} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">{order.clientName}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {STATUS_LABELS[order.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {order.productDescription}
                        </p>
                        {order.materials && order.materials.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <Package className="h-3 w-3" />
                            {order.materials.map((m) => m.name).join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={cn(
                          'text-sm font-bold',
                          isDelivered ? 'text-emerald-600' : 'text-foreground',
                        )}>
                          {fmt(order.price)}
                        </span>
                        {!isDelivered && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => { setIsDialogOpen(false); navigate(`/producao?edit=${order.id}`); }}
                          >
                            Ver pedido
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Today's section */}
        <div className="mt-6 bg-card rounded-2xl shadow-soft p-5">
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Entregas de Hoje
          </h3>
          {(() => {
            const todayPending = orders.filter(
              (o) => o.status !== 'delivered' && isSameDay(o.deadline, new Date())
            );
            const todayDelivered = orders.filter((o) => {
              if (o.status !== 'delivered') return false;
              const d = o.deliveredAt
                ? (o.deliveredAt instanceof Date ? o.deliveredAt : new Date(o.deliveredAt))
                : (o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt));
              return isSameDay(d, new Date());
            });

            if (todayPending.length === 0 && todayDelivered.length === 0) {
              return (
                <p className="text-muted-foreground text-center py-4 text-sm">
                  Nenhuma entrega programada para hoje.
                </p>
              );
            }

            return (
              <div className="space-y-2">
                {todayPending.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-alert-urgent-bg animate-pulse-urgent">
                    <AlertTriangle className="h-4 w-4 text-alert-urgent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{o.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.productDescription}</p>
                    </div>
                    <span className="font-semibold text-alert-urgent text-sm">{fmt(o.price)}</span>
                  </div>
                ))}
                {todayDelivered.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-emerald-700">{o.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.productDescription}</p>
                    </div>
                    <span className="font-semibold text-emerald-700 text-sm">{fmt(o.price)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

      </div>
    </TooltipProvider>
  );
}
