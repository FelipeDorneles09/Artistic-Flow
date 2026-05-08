import { AlertTriangle, ArrowRight, PackageCheck } from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useOrderStore } from '@/store/orderStore';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

export function LowStockWidget() {
  const items = useInventoryStore((state) => state.items);
  const orders = useOrderStore((state) => state.orders);

  // Calculate reserved stock (same logic as Estoque.tsx)
  const reservedMap = useMemo(() => {
    const map: Record<string, number> = {};
    orders
      .filter((o) => o.status === 'to_buy')
      .forEach((order) => {
        order.materials?.forEach((mat) => {
          const required = parseFloat(mat.quantity) || 1;
          const deducted = order.deductedMaterials?.[mat.id] || 0;
          const reserved = Math.max(0, required - deducted);
          if (reserved > 0) map[mat.id] = (map[mat.id] || 0) + reserved;
        });
      });
    return map;
  }, [orders]);

  const lowStockItems = useMemo(
    () =>
      items.filter((item) => {
        if (item.minQuantity === undefined || item.minQuantity <= 0) return false;
        const reserved = reservedMap[item.id] || 0;
        return item.quantity - reserved < item.minQuantity;
      }),
    [items, reservedMap]
  );

  // Hide widget when everything is fine
  if (lowStockItems.length === 0) return null;

  return (
    <div className="bg-alert-warning-bg border border-alert-warning/30 rounded-2xl p-5 shadow-soft animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-alert-warning/20 text-alert-warning">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-alert-warning leading-none">
              Estoque Baixo
            </h3>
            <p className="text-xs text-alert-warning/70 mt-0.5">
              {lowStockItems.length} {lowStockItems.length === 1 ? 'material precisa' : 'materiais precisam'} de reposição
            </p>
          </div>
        </div>
        <Link to="/estoque">
          <Button
            variant="ghost"
            size="sm"
            className="text-alert-warning hover:text-alert-warning hover:bg-alert-warning/10"
          >
            Ver Estoque
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {lowStockItems.map((item) => {
          const reserved = reservedMap[item.id] || 0;
          const disponivel = item.quantity - reserved;
          return (
            <div
              key={item.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-alert-warning/20 text-xs"
            >
              <PackageCheck className="h-3.5 w-3.5 text-alert-warning shrink-0" />
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="text-alert-warning font-semibold">
                {disponivel.toFixed(disponivel % 1 === 0 ? 0 : 2)} {item.unit}
              </span>
              {item.minQuantity !== undefined && (
                <span className="text-muted-foreground">
                  / mín {item.minQuantity} {item.unit}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
