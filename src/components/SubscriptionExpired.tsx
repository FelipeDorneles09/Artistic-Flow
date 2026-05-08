import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Sparkles, Loader2, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { redirectToCheckout } from "@/lib/stripe";
import { useSubscription } from "@/hooks/useSubscription";
import { useManageSubscription } from "@/hooks/useManageSubscription";

const SubscriptionExpired = () => {
  const { user, signOut } = useAuth();
  const { subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const { openPortal, loading: portalLoading } = useManageSubscription();

  const hasExistingSubscription = !!subscription?.stripeSubscriptionId;

  const handleCheckout = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await redirectToCheckout(user.email || "", user.uid);
    } catch (error) {
      console.error("Checkout error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Período de teste expirado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Seu período de teste gratuito de 7 dias terminou.
            Para continuar usando o ArtFlow, assine o plano Premium.
          </p>

          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Plano Premium</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              R$ 49<span className="text-lg font-normal text-muted-foreground">/mês</span>
            </div>
            <p className="text-sm text-muted-foreground">Acesso ilimitado a todas as funcionalidades</p>
          </div>

          <div className="space-y-3">
            {hasExistingSubscription ? (
              /* Usuário já assinou antes — leva ao portal para reativar/atualizar cartão */
              <Button
                onClick={openPortal}
                className="w-full"
                size="lg"
                disabled={portalLoading}
              >
                {portalLoading
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <CreditCard className="w-4 h-4 mr-2" />}
                {portalLoading ? "Abrindo portal..." : "Gerenciar assinatura"}
              </Button>
            ) : (
              /* Usuário nunca assinou — leva ao checkout */
              <Button
                onClick={handleCheckout}
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? "Redirecionando..." : "Assinar Premium"}
              </Button>
            )}

            <Button variant="ghost" onClick={signOut} className="w-full">
              Sair da conta
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Pagamento seguro processado pelo Stripe
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionExpired;
