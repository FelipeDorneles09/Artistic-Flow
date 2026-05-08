export interface PricingSettings {
  id: string;
  monthlyFixedCosts: number;   // Custos fixos anuais/mensais do ateliê
  workingHoursPerMonth: number; // Quantas horas o artesão trabalha no mês
  hourlyRate: number;          // Valor da hora calculado/desejado
  profitMarginPercent: number; // Margem de lucro padrão (%)
  monthlyGoal: number;         // Meta de faturamento mensal (R$)
}
