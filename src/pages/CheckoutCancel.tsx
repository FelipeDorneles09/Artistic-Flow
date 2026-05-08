import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

const CheckoutCancel = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Pagamento cancelado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            O processo de pagamento foi cancelado. Você pode tentar novamente quando quiser.
          </p>
          
          <div className="space-y-3">
            <Link to="/dashboard">
              <Button className="w-full" size="lg">
                Voltar ao Dashboard
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="w-full">
                Ir para a página inicial
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutCancel;
