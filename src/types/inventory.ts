export type UnitMeasurment = 'unidade' | 'cm' | 'metro' | 'grama' | 'kg' | 'ml' | 'litro' | 'outro';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: UnitMeasurment;
  cost: number; // Cost for the total quantity in stock, or cost per unit. Let's make it cost per unit.
  // Actually, standard is "custo unitário" (cost per unit)
  costPerUnit: number;
  minQuantity?: number; // Quantidade mínima de alerta (opcional)
  createdAt?: Date;
  updatedAt?: Date;
}
