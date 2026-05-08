import { useState, useMemo } from 'react';
import { History, TrendingUp, TrendingDown, Minus, Package, Trash2, CalendarDays, X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { fetchInventoryHistory, InventoryHistoryEntry, HistoryEventType } from '@/lib/inventoryHistoryApi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const EVENT_CONFIG: Record<HistoryEventType, { label: string; color: string; icon: React.ReactNode }> = {
  item_created: {
    label: 'Criado',
    color: 'bg-blue-500/15 text-blue-700 border-blue-200',
    icon: <Package className="h-3.5 w-3.5" />,
  },
  item_deleted: {
    label: 'Excluído',
    color: 'bg-gray-400/15 text-gray-600 border-gray-300',
    icon: <Trash2 className="h-3.5 w-3.5" />,
  },
  manual_add: {
    label: 'Entrada Manual',
    color: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  manual_subtract: {
    label: 'Saída Manual',
    color: 'bg-red-500/15 text-red-700 border-red-200',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  manual_set: {
    label: 'Ajuste',
    color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200',
    icon: <Minus className="h-3.5 w-3.5" />,
  },
  order_deduction: {
    label: 'Dedução de Pedido',
    color: 'bg-orange-500/15 text-orange-700 border-orange-200',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  order_refund: {
    label: 'Devolução de Pedido',
    color: 'bg-teal-500/15 text-teal-700 border-teal-200',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  price_change: {
    label: 'Alteração de Preço',
    color: 'bg-purple-500/15 text-purple-700 border-purple-200',
    icon: <Tag className="h-3.5 w-3.5" />,
  },
};

type QuickFilter = 'all' | 'today' | '7d' | '30d' | 'custom';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'all',   label: 'Todos' },
  { key: 'today', label: 'Hoje' },
  { key: '7d',    label: 'Últimos 7 dias' },
  { key: '30d',   label: 'Últimos 30 dias' },
  { key: 'custom',label: 'Período' },
];

function startOfDay(d: Date) {
  const c = new Date(d); c.setHours(0, 0, 0, 0); return c;
}
function endOfDay(d: Date) {
  const c = new Date(d); c.setHours(23, 59, 59, 999); return c;
}
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

// Convert "YYYY-MM-DD" string from <input type="date"> to a Date
function parseInputDate(val: string): Date | null {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function InventoryHistoryDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<InventoryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput]   = useState('');

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setLoading(true);
      try {
        const data = await fetchInventoryHistory();
        setEntries(data);
      } catch {
        toast({ title: 'Erro ao carregar histórico', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
  };

  // Derive the active date window
  const { from, to } = useMemo(() => {
    const now = new Date();
    if (quickFilter === 'today')  return { from: startOfDay(now), to: endOfDay(now) };
    if (quickFilter === '7d')     return { from: daysAgo(6),      to: endOfDay(now) };
    if (quickFilter === '30d')    return { from: daysAgo(29),     to: endOfDay(now) };
    if (quickFilter === 'custom') {
      const f = fromInput ? startOfDay(parseInputDate(fromInput)!) : null;
      const t = toInput   ? endOfDay(parseInputDate(toInput)!)     : null;
      return { from: f, to: t };
    }
    return { from: null, to: null };
  }, [quickFilter, fromInput, toInput]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (from && e.createdAt < from) return false;
      if (to   && e.createdAt > to)   return false;
      return true;
    });
  }, [entries, from, to]);

  const clearCustom = () => { setFromInput(''); setToInput(''); };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <History className="h-4 w-4" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico do Estoque
          </DialogTitle>

          {/* Quick filters */}
          <div className="flex flex-wrap gap-1.5 pt-3">
            {QUICK_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setQuickFilter(f.key)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  quickFilter === f.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {quickFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={fromInput}
                  onChange={e => setFromInput(e.target.value)}
                  className="h-8 text-sm w-36"
                />
                <span className="text-muted-foreground text-xs">até</span>
                <Input
                  type="date"
                  value={toInput}
                  onChange={e => setToInput(e.target.value)}
                  className="h-8 text-sm w-36"
                />
              </div>
              {(fromInput || toInput) && (
                <button onClick={clearCustom} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {filtered.length > 0 && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <History className="h-10 w-10 opacity-30" />
              <p>{entries.length === 0 ? 'Nenhum registro encontrado ainda.' : 'Nenhum registro no período selecionado.'}</p>
              {entries.length === 0 && (
                <p className="text-xs">As alterações no estoque aparecerão aqui.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => {
                const config = EVENT_CONFIG[entry.eventType] || EVENT_CONFIG.manual_set;
                const deltaPositive = entry.delta >= 0;
                return (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 p-1.5 rounded-full border ${config.color}`}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{entry.itemName}</span>
                        <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 border ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {entry.eventType === 'price_change' ? (
                          // Price change: show old cost → new cost
                          <span>
                            R$ {entry.previousCost?.toFixed(2) ?? '?'}{' '}/{' '}{entry.unit} →{' '}
                            <strong className="text-purple-700">
                              R$ {entry.newCost?.toFixed(2) ?? '?'} / {entry.unit}
                            </strong>
                          </span>
                        ) : (
                          // Quantity change: show qty delta
                          <>
                            <span>
                              {entry.previousQty} {entry.unit} →{' '}
                              <strong className="text-foreground">{entry.newQty} {entry.unit}</strong>
                            </span>
                            <span className={`font-semibold ${deltaPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                              {deltaPositive ? '+' : ''}{entry.delta.toFixed(2)} {entry.unit}
                            </span>
                          </>
                        )}
                        {entry.relatedOrderClient && (
                          <span className="text-muted-foreground">
                            👤 <strong className="text-foreground">{entry.relatedOrderClient}</strong>
                            {entry.relatedOrderProduct && <> — {entry.relatedOrderProduct}</>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && filtered.length > 0 && quickFilter !== 'custom' && (
          <div className="px-6 py-2 border-t border-border text-xs text-muted-foreground text-right">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
