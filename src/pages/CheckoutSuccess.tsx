import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"processing" | "confirmed" | "not_confirmed">("processing");
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Start a timeout regardless of auth state to avoid infinite loader
  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setStatus((s) => (s === "confirmed" ? s : "not_confirmed"));
    }, 15000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // When the user is available, start listening for Firestore updates
  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setError("Usuário não identificado. Faça login e tente novamente.");
      setStatus("not_confirmed");
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data();
        console.log("CheckoutSuccess: user snapshot", { id: user.uid, data });
        if (!data) return;
        const currentPeriodEnd = data.currentPeriodEnd?.toDate?.() ?? data.currentPeriodEnd;
        const hasSubscription = !!data.stripeSubscriptionId && currentPeriodEnd && new Date(currentPeriodEnd) > new Date();
        if (hasSubscription) {
          setStatus("confirmed");
        }
      },
      (err) => {
        console.error("Erro ao escutar usuário:", err);
        setError("Erro ao verificar status da assinatura.");
      }
    );

    return () => unsub();
  }, [authLoading, user]);

  useEffect(() => {
    if (status === "confirmed") {
      const t = setTimeout(() => navigate("/dashboard"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  const handleRetry = () => {
    setStatus("processing");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    // restart timer via effect by toggling status briefly
    const t = setTimeout(() => setStatus("processing"), 50);
    setTimeout(() => clearTimeout(t), 60);
  };

  if (authLoading || status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Processando pagamento...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              Aguarde enquanto ativamos sua assinatura...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-8">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (status === "confirmed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Pagamento confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Sua assinatura Premium foi ativada com sucesso!</p>
            <p className="text-sm text-muted-foreground">Redirecionando para o dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // status === 'not_confirmed'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Aguardando confirmação do pagamento</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Ainda não recebemos a confirmação do pagamento pela Stripe. A atualização da sua assinatura
            será feita automaticamente quando o pagamento for confirmado.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRetry}>Reverificar</Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Ir para o dashboard
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Se o problema persistir, entre em contato com o suporte.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;
