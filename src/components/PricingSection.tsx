import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/stripe";

const PricingSection = () => {
  const premiumFeatures = [
    "Kanban ilimitado de pedidos",
    "Calculadora de preço justo (custo + hora + margem)",
    "Controle de estoque com alertas de mínimo",
    "Histórico financeiro com filtro de período",
    "Radar de prazos em tempo real",
    "Lista de compras inteligente",
    "Atalho para WhatsApp (mensagem pré-formatada)",
    "Meta mensal de faturamento",
    "Calendário de entregas",
    "Notificações automáticas de prazo e estoque",
    "Exportação CSV (pedidos, estoque e financeiro)",
  ];

  const freeFeatures = [
    `Acesso completo por ${TRIAL_DAYS} dias`,
    "Todas as funcionalidades",
    "Sem necessidade de cartão",
  ];

  return (
    <section id="pricing" className="container mx-auto px-4 py-20">
      <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
        Escolha seu plano
      </h2>
      <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
        Comece grátis e experimente todas as funcionalidades. Sem compromisso.
      </p>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Trial Plan */}
        <Card className="border-border/50 relative">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">Teste Grátis</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold text-foreground">R$ 0</span>
              <span className="text-muted-foreground ml-2">/ {TRIAL_DAYS} dias</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <Link to="/login?mode=signup" className="block">
              <Button variant="outline" className="w-full" size="lg">
                Começar Teste Grátis
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card className="border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
            MAIS POPULAR
          </div>
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Premium</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold text-foreground">R$ 49</span>
              <span className="text-muted-foreground ml-2">/ mês</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <Link to="/login?mode=signup" className="block">
              <Button className="w-full" size="lg">
                Assinar Agora
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default PricingSection;
