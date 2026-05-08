import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { useOrderStore } from '@/store/orderStore';
import { STATUS_LABELS, OrderStatus } from '@/types/order';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<OrderStatus, string> = {
  to_buy: 'hsl(38, 92%, 50%)',
  production: 'hsl(168, 50%, 40%)',
  finishing: 'hsl(25, 80%, 55%)',
  ready: 'hsl(142, 70%, 45%)',
  delivered: 'hsl(215, 20%, 65%)',
};

export function BottleneckChart() {
  const orders = useOrderStore((state) => state.orders);

  const statusCounts = {
    to_buy: orders.filter((o) => o.status === 'to_buy').length,
    production: orders.filter((o) => o.status === 'production').length,
    finishing: orders.filter((o) => o.status === 'finishing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
  };

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status as OrderStatus],
    status: status as OrderStatus,
    count,
  }));

  const maxStatus = Object.entries(statusCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  );
  const hasBottleneck = maxStatus[0] === 'to_buy' && maxStatus[1] > 0;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-lg">Gargalo de Produção</h3>
        </div>
        {hasBottleneck && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-alert-warning-bg text-alert-warning text-xs font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            Compras pendentes!
          </div>
        )}
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                boxShadow: 'var(--shadow-medium)',
              }}
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Distribuição atual dos pedidos por etapa
      </p>
    </div>
  );
}
