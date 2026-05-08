import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  ShoppingBag,
  Calendar,
  Package,
  Calculator,
  Plus,
  Scissors,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X as CloseIcon,
  CreditCard,
  Loader2
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NewOrderDialog } from '@/components/NewOrderDialog';
import { useSubscription } from '@/hooks/useSubscription';
import { useManageSubscription } from '@/hooks/useManageSubscription';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Visão Geral', path: '/dashboard' },
  { icon: Kanban, label: 'Produção', path: '/producao' },
  { icon: ShoppingBag, label: 'Lista de Compras', path: '/compras' },
  { icon: Package, label: 'Estoque', path: '/estoque' },
  { icon: Calendar, label: 'Calendário', path: '/calendario' },
  { icon: Calculator, label: 'Precificação', path: '/precificacao' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const { subscription } = useSubscription();
  const { openPortal, loading: portalLoading } = useManageSubscription();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Scissors className="h-4 w-4" />
          </div>
          <h1 className="font-bold text-sidebar-foreground text-base">ArtFlow</h1>
        </div>
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 z-40 bg-sidebar transition-all duration-300 ease-in-out flex flex-col',
          'top-16 h-[calc(100vh-4rem)] lg:top-0 lg:h-screen',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo (Desktop only) */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Scissors className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in">
              <h1 className="font-bold text-sidebar-foreground text-lg">ArtFlow</h1>
              <p className="text-xs text-sidebar-foreground/60">Gestão Artesanal</p>
            </div>
          )}
        </div>

        <div className="p-4 border-b border-sidebar-border hidden lg:flex items-center justify-between">
          <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Notificações</span>
          <NotificationCenter />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'sidebar-item',
                  isActive && 'sidebar-item-active',
                  isCollapsed && 'justify-center px-3'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions: Logout + New Order */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button
            onClick={() => setIsNewOrderOpen(true)}
            className={cn(
              'w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 font-semibold',
              isCollapsed ? 'px-3' : 'px-4'
            )}
            size={isCollapsed ? 'icon' : 'default'}
          >
            <Plus className={cn('h-5 w-5', !isCollapsed && 'mr-2')} />
            {!isCollapsed && 'Novo Pedido'}
          </Button>

          {subscription?.stripeSubscriptionId && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              title="Gerenciar assinatura"
              className={cn(
                'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors disabled:opacity-50',
                isCollapsed && 'justify-center'
              )}
            >
              {portalLoading
                ? <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                : <CreditCard className="h-4 w-4 flex-shrink-0" />}
              {!isCollapsed && <span>Gerenciar assinatura</span>}
            </button>
          )}

          <button
            onClick={handleLogout}
            title="Sair da conta"
            className={cn(
              'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-colors',
              isCollapsed && 'justify-center'
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>

        {/* Collapse Toggle (Desktop only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full bg-card border border-border shadow-soft text-muted-foreground hover:text-foreground transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300 ease-in-out min-w-0',
          'pt-16 lg:pt-0',
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        <div className="min-h-screen p-4 md:p-8">{children}</div>
      </main>

      {/* New Order Dialog */}
      <NewOrderDialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen} />
    </div>
  );
}
