import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";
import SubscriptionExpired from "./SubscriptionExpired";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: subLoading, subscription, daysRemaining } = useSubscription();

  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    // Reset when loading
    if (subLoading) {
      setShowExpired(false);
      return;
    }

    // If there's no access, wait a bit before showing the expired screen
    if (!hasAccess) {
      const t = setTimeout(() => setShowExpired(true), 700);
      return () => clearTimeout(t);
    }

    // If access granted, ensure expired screen is hidden
    setShowExpired(false);
  }, [subLoading, hasAccess]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAccess) {
    // while waiting for the debounce, show loader to avoid flash
    if (!showExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    return <SubscriptionExpired />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
