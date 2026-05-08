export type OrderStatus = 'to_buy' | 'production' | 'finishing' | 'ready' | 'delivered';

export interface Material {
  id: string;
  name: string;
  quantity: string;
}

export interface Order {
  id: string;
  clientName: string;
  productDescription: string;
  deadline: Date;
  price: number;
  status: OrderStatus;
  materials: Material[];
  deductedMaterials?: Record<string, number>;
  referenceImage: string;
  clientPhone: string;
  createdAt: Date;
  deliveredAt?: Date; // Data real de entrega (quando muda para 'delivered')
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  to_buy: 'A Comprar',
  production: 'Em Produção',
  finishing: 'Acabamento',
  ready: 'Pronto',
  delivered: 'Entregue',
};

export const STATUS_COLUMNS: OrderStatus[] = ['to_buy', 'production', 'finishing', 'ready'];

export type DeadlineStatus = 'urgent' | 'warning' | 'ok';

export function getDeadlineStatus(deadline: Date): DeadlineStatus {
  const today = new Date();
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 3) return 'urgent';
  if (diffDays < 7) return 'warning';
  return 'ok';
}

export function getDaysUntilDeadline(deadline: Date): number {
  const today = new Date();
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
