import { Link } from "react-router-dom";
import { Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-alert-warning-bg mb-6">
        <AlertCircle className="h-10 w-10 text-alert-warning" />
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-6">
        Página não encontrada
      </p>
      <Link to="/">
        <Button className="gap-2">
          <Home className="h-4 w-4" />
          Voltar ao início
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
