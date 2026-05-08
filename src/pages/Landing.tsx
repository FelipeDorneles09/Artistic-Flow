import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  CalendarClock,
  LayoutDashboard,
  ShoppingCart,
  MessageCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Sparkles,
  Package,
  DollarSign,
  BarChart3,
  ArrowRight,
  Star,
  ChevronDown,
  Send,
  Phone,
  Mail,
  MapPin,
  Menu,
  X,
  Shield,
  Zap,
  Users,
  Bell,
  FileDown,
  Instagram,
} from "lucide-react";
import PricingSection from "@/components/PricingSection";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

/* ─── Intersection-observer hook ─── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

/* ─── Individual animated section wrapper ─── */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Counter animation hook ─── */
function useCounter(target: number, started: boolean, duration = 1800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, started, duration]);
  return count;
}

/* ─── Stats counter card ─── */
function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay?: number }) {
  const { ref, visible } = useReveal();
  const count = useCounter(value, visible);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay ?? 0}ms` }}
      className="text-center p-8 rounded-2xl bg-white border border-gray-100 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group">
      <div className="text-5xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">
        {count}{suffix}
      </div>
      <p className="text-muted-foreground mt-2 font-medium">{label}</p>
    </div>
  );
}

/* ─── Flexible media renderer for images and videos ─── */
function MediaRenderer({ src, alt, className }: { src: string; alt: string; className?: string }) {
  if (src.endsWith(".mp4")) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className={className}
        title={alt}
      />
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}

const Landing = () => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [formStatus, setFormStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleLogout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      icon: LayoutDashboard,
      title: "Kanban Visual",
      description: "Organize seus pedidos em colunas visuais e arraste para atualizar o status instantaneamente. Interface intuitiva pensada para o dia a dia do artesão.",
    },
    {
      icon: CalendarClock,
      title: "Radar de Prazos",
      description: "Nunca mais perca um prazo. Alertas visuais mostram quais pedidos precisam de atenção urgente com código de cores em tempo real.",
    },
    {
      icon: ShoppingCart,
      title: "Lista de Compras Inteligente",
      description: "Materiais de todos os pedidos organizados automaticamente em uma lista prática, com déficits calculados e reposição facilitada.",
    },
    {
      icon: MessageCircle,
      title: "Atalho para WhatsApp",
      description: "Avise seus clientes com um clique. O sistema gera uma mensagem pré-formatada com o status do pedido, pronta para enviar.",
    },
    {
      icon: TrendingUp,
      title: "Metas Financeiras",
      description: "Acompanhe seu faturamento e veja quanto falta para atingir suas metas mensais com gráficos e indicadores visuais.",
    },
    {
      icon: Clock,
      title: "Calendário de Entregas",
      description: "Visualize todas as entregas do mês em um calendário organizado e intuitivo, sem perder nenhum compromisso.",
    },
    {
      icon: Package,
      title: "Controle de Estoque",
      description: "Gerencie materiais com alertas de estoque mínimo e histórico completo de movimentações para nunca ficar sem insumos.",
    },
    {
      icon: DollarSign,
      title: "Precificação Inteligente",
      description: "Calcule o preço justo dos seus produtos com base em custo de materiais, horas trabalhadas e margem de lucro desejada.",
    },
    {
      icon: BarChart3,
      title: "Relatórios Financeiros",
      description: "Tenha visão clara do seu negócio com histórico financeiro filtrado por período e margens de lucro calculadas automaticamente.",
    },
    {
      icon: Bell,
      title: "Notificações em Tempo Real",
      description: "Centro de alertas automáticos que avisa sobre prazos urgentes e estoque baixo antes que se tornem um problema — sem precisar abrir o sistema.",
    },
    {
      icon: FileDown,
      title: "Exportação para Planilha",
      description: "Exporte pedidos, estoque, lista de compras e relatório financeiro completo em CSV com um clique — compatível com Excel e Google Sheets.",
    },
  ];

  const tabs = [
    {
      label: "Kanban de Pedidos",
      heading: "Controle total da sua produção",
      text: "Visualize todos os pedidos em andamento, arraste entre colunas e nunca mais perca um prazo. O status do cliente atualiza em tempo real.",
      img: "/media/kanban-uso.mp4",
    },
    {
      label: "Dashboard Financeiro",
      heading: "Saúde financeira na ponta dos dedos",
      text: "Acompanhe faturamento, margem de lucro e metas mensais com gráficos interativos. Tenha clareza sobre cada centavo do seu negócio.",
      img: "/media/dashboard.png",
    },
    {
      label: "Calculadora de Preços",
      heading: "Cobre o preço justo e tenha lucro",
      text: "Nossa calculadora inteligente considera o custo exato da quantidade de materiais usados, sua hora de trabalho e a margem de lucro desejada. Nunca mais tenha prejuízo por cobrar errado.",
      img: "/media/precificacao.png",
    },
    {
      label: "Estoque e Compras",
      heading: "Materiais sempre disponíveis",
      text: "Alertas automáticos de estoque mínimo, lista de compras gerada pelo sistema e histórico completo. Nunca pare uma produção por falta de material.",
      img: "/media/estoque-compras.mp4",
    },
    {
      label: "Calendário",
      heading: "Suas entregas organizadas",
      text: "Calendário visual com todas as entregas do mês, prazos destacados e integração completa com seus pedidos. Planeje sua semana com confiança.",
      img: "/media/calendario.mp4",
    },
  ];

  const testimonials = [
    {
      name: "Mariana Costa",
      role: "Artesã de Macramê",
      text: "Antes eu perdia pedidos em caderninho. Agora tenho tudo organizado e meu faturamento aumentou 40% porque consigo aceitar mais encomendas com segurança.",
      stars: 5,
      avatar: "https://picsum.photos/seed/avatar1/80/80",
    },
    {
      name: "Roberto Almeida",
      role: "Ceramista",
      text: "O controle de estoque mudou meu negócio. Sei exatamente quando pedir argila e nunca mais parei uma produção por falta de material.",
      stars: 5,
      avatar: "https://picsum.photos/seed/avatar2/80/80",
    },
    {
      name: "Juliana Pereira",
      role: "Criadora de Biscuit",
      text: "A calculadora de preço foi uma revelação. Descobri que estava vendendo abaixo do custo! Agora precifiço com confiança e tenho margem de lucro real.",
      stars: 5,
      avatar: "https://picsum.photos/seed/avatar3/80/80",
    },
  ];

  const faqs = [
    {
      q: "Preciso instalar algum software?",
      a: "Não! O ArtFlow é 100% online. Funciona em qualquer dispositivo com navegador — computador, tablet ou celular. Sem instalação, sem complicação.",
    },
    {
      q: "Meus dados ficam seguros?",
      a: "Sim. Usamos criptografia de ponta e armazenamento em nuvem com backup automático. Seus dados de pedidos e financeiro estão sempre protegidos.",
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Absolutamente. Sem fidelidade, sem taxa de cancelamento. Se quiser pausar ou encerrar sua assinatura, basta fazer isso nas configurações da conta.",
    },
    {
      q: "O período de teste tem limitações?",
      a: "Nenhuma! Durante o período de teste você tem acesso a todas as funcionalidades premium sem nenhuma restrição. Nem precisa de cartão de crédito.",
    },
    {
      q: "Consigo cadastrar meus pedidos atuais?",
      a: "Sim! Você cadastra seus pedidos em andamento diretamente na plataforma. O processo é rápido e intuitivo — a maioria dos artesãos migra tudo em menos de 30 minutos e começa a organizar a produção no mesmo dia.",
    },
  ];

  /* ─── Form submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus("sending");
    try {
      // Using FormSubmit.co as a free email forwarder (no backend needed)
      const resp = await fetch("https://formsubmit.co/ajax/fdorneles63@gmail.com", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: `[ArtFlow] Mensagem de ${formData.name}`,
          _captcha: "false",
        }),
      });
      if (resp.ok) {
        setFormStatus("sent");
        setFormData({ name: "", email: "", message: "" });
      } else {
        setFormStatus("error");
      }
    } catch {
      setFormStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ══════════════ NAVBAR ══════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100" : "bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">ArtFlow</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {["Funcionalidades", "Dashboard", "Preços", "FAQ", "Contato"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button size="sm" className="font-medium px-5 shadow-sm">Acessar Dashboard</Button>
                </Link>
                <Button variant="ghost" size="sm" className="font-medium" onClick={handleLogout}>Sair</Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-medium">Entrar</Button>
                </Link>
                <Link to="/login?mode=signup">
                  <Button size="sm" className="font-medium px-5 shadow-sm">Começar Grátis</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-2">
            {["Funcionalidades", "Dashboard", "Preços", "FAQ", "Contato"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-50 rounded-lg transition-colors"
              >
                {item}
              </a>
            ))}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {user ? (
                <>
                  <Link to="/dashboard" className="flex-1">
                    <Button className="w-full" size="sm">Acessar Dashboard</Button>
                  </Link>
                  <Button variant="outline" className="flex-1" size="sm" onClick={handleLogout}>Sair</Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full" size="sm">Entrar</Button>
                  </Link>
                  <Link to="/login?mode=signup" className="flex-1">
                    <Button className="w-full" size="sm">Começar Grátis</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ══════════════ HERO ══════════════ */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Decoration blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              A plataforma favorita dos artesãos profissionais
            </div>

            <h1
              className="text-5xl md:text-7xl font-bold text-foreground leading-tight mb-6"
              style={{ animation: "fadeIn 0.7s ease-out forwards" }}
            >
              Organize sua produção artesanal{" "}
              <span className="text-primary relative">
                sem estresse
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10C50 4 100 2 150 5 200 8 250 6 298 2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
                </svg>
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed" style={{ animation: "fadeIn 0.8s ease-out 0.1s both" }}>
              O sistema completo para artesãos e pequenos produtores controlarem pedidos,
              prazos, materiais e faturamento em um só lugar. Foque no que você ama fazer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center" style={{ animation: "fadeIn 0.8s ease-out 0.2s both" }}>
              <Link to="/login?mode=signup">
                <Button size="lg" className="text-base px-8 h-13 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 group">
                  Começar Grátis
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="#dashboard">
                <Button size="lg" variant="outline" className="text-base px-8 h-13 hover:bg-gray-50">
                  Ver o Dashboard
                </Button>
              </a>
            </div>

            <p className="text-sm text-muted-foreground mt-4" style={{ animation: "fadeIn 0.8s ease-out 0.3s both" }}>
              Sem cartão de crédito · Teste grátis por 7 dias · Cancele quando quiser
            </p>
          </div>

          {/* Hero image */}
          <div className="mt-16 relative max-w-5xl mx-auto" style={{ animation: "fadeIn 1s ease-out 0.4s both" }}>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100 ring-1 ring-black/5 bg-white flex">
              <MediaRenderer
                src="/media/kanban-meta.mp4"
                alt="ArtFlow Dashboard Reaching Goal"
                className="w-full h-auto"
              />
            </div>
            {/* Floating badges */}
            <div className="absolute -top-4 -left-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-2 animate-float border border-gray-100">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Pedido Entregue</p>
                <p className="text-xs text-muted-foreground">Bolsa de couro · R$180</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-2 animate-float border border-gray-100" style={{ animationDelay: "0.5s" }}>
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Meta atingida!</p>
                <p className="text-xs text-muted-foreground">R$ 3.200 este mês</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ STATS ══════════════ */}
      <section className="py-20 px-6 bg-gray-50/60">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard value={500} suffix="+" label="Artesãos ativos" delay={0} />
            <StatCard value={12000} suffix="+" label="Pedidos gerenciados" delay={100} />
            <StatCard value={98} suffix="%" label="Satisfação dos usuários" delay={200} />
            <StatCard value={40} suffix="%" label="Aumento médio de produtividade" delay={300} />
          </div>
        </div>
      </section>

      {/* ══════════════ FEATURES ══════════════ */}
      <section id="funcionalidades" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Funcionalidades
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
                Tudo que você precisa para crescer
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Ferramentas pensadas especialmente para quem trabalha com produção artesanal e personalizada.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Reveal key={index} delay={index * 60}>
                <div className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-primary/30 hover:shadow-xl transition-all duration-300 cursor-default h-full">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <feature.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ DASHBOARD TABS ══════════════ */}
      <section id="dashboard" className="py-24 px-6 bg-gray-50/60">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Dashboard
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
                Uma ferramenta, múltiplas visões
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Navegue entre os módulos e veja como o ArtFlow organiza cada parte do seu negócio.
              </p>
            </div>
          </Reveal>

          {/* Tab buttons */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === i
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-muted-foreground border border-gray-200 hover:border-primary/40 hover:text-foreground"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div>
                <h3 className="text-3xl font-bold text-foreground mb-4">{tabs[activeTab].heading}</h3>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{tabs[activeTab].text}</p>
                <Link to="/login?mode=signup">
                  <Button className="group">
                    Experimentar grátis
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </Reveal>
            <div
              key={activeTab}
              className="rounded-2xl overflow-hidden shadow-2xl border border-gray-100 ring-1 ring-black/5 bg-white flex"
              style={{ animation: "fadeIn 0.4s ease-out" }}
            >
              <MediaRenderer
                src={tabs[activeTab].img}
                alt={tabs[activeTab].label}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Como funciona
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
                Comece em minutos
              </h2>
              <p className="text-lg text-muted-foreground">Sem complexidade. Sem curva de aprendizado longa.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { step: "01", icon: Users, title: "Conta grátis", text: "Acesse todas funcionalidades grátis por 7 dias." },
              { step: "02", icon: DollarSign, title: "Precifique certo", text: "Calcule os custos exatos dos materiais e veja seu lucro real." },
              { step: "03", icon: Package, title: "Kanban visual", text: "Cadastre prazos e gerencie todos seus pedidos sem estresse." },
              { step: "04", icon: TrendingUp, title: "Monitore metas", text: "Acompanhe faturamento, controle o estoque e cresça." },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 120}>
                <div className="relative text-center group">
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-10 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-px bg-gradient-to-r from-primary/40 to-transparent" />
                  )}
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                    <item.icon className="w-9 h-9 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <span className="text-xs font-bold text-primary/50 uppercase tracking-widest mb-2 block">{item.step}</span>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ BENEFITS BANNER ══════════════ */}
      <section className="py-20 px-6 bg-primary text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div>
                <h2 className="text-4xl font-bold mb-6">Por que artesãos escolhem o ArtFlow?</h2>
                <ul className="space-y-4">
                  {[
                    "Reduza a ansiedade com prazos visíveis e alertas automáticos",
                    "Aumente sua produtividade organizando todos os pedidos",
                    "Nunca esqueça de comprar materiais com a lista inteligente",
                    "Avise clientes com atalho direto para o WhatsApp",
                    "Tenha controle total do seu faturamento e metas",
                    "Precifique corretamente e maximize seu lucro",
                  ].map((benefit, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-white/90">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/5 flex">
                <MediaRenderer
                  src="/media/artesa.png"
                  alt="Artesã usando o ArtFlow"
                  className="w-full h-auto"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Depoimentos
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
                Artesãos reais, resultados reais
              </h2>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-xl hover:border-primary/20 transition-all duration-300 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {Array(t.stars).fill(0).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground leading-relaxed flex-1 mb-6 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ SECURITY BADGES ══════════════ */}
      <section className="py-16 px-6 bg-gray-50/60 border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-foreground mb-2">Segurança que você pode confiar</h2>
              <p className="text-muted-foreground">Seus dados protegidos com os mais altos padrões do mercado.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: "Dados criptografados", sub: "SSL/TLS 256-bit" },
              { icon: Zap, label: "99.9% uptime", sub: "Alta disponibilidade" },
              { icon: CheckCircle2, label: "Backup automático", sub: "Diário em nuvem" },
              { icon: Users, label: "LGPD compliant", sub: "Proteção de dados" },
            ].map((item, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="flex flex-col items-center text-center p-5 bg-white rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ PRICING ══════════════ */}
      <section id="preços">
        <PricingSection />
      </section>

      {/* ══════════════ FAQ ══════════════ */}
      <section id="faq" className="py-24 px-6 bg-gray-50/60">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                FAQ
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
                Perguntas frequentes
              </h2>
              <p className="text-lg text-muted-foreground">Tem outra dúvida? Entre em contato pelo formulário abaixo.</p>
            </div>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={i * 60}>
                <div
                  className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${faqOpen === i ? "border-primary/30 shadow-sm" : "border-gray-100 hover:border-gray-200"
                    }`}
                >
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left"
                    aria-expanded={faqOpen === i}
                  >
                    <span className="font-semibold text-foreground">{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground flex-shrink-0 ml-4 transition-transform duration-300 ${faqOpen === i ? "rotate-180 text-primary" : ""
                        }`}
                    />
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: faqOpen === i ? "300px" : "0px" }}
                  >
                    <p className="px-6 pb-6 text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ CONTACT ══════════════ */}
      <section id="contato" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Contato
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-5">
                Fale com a gente
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Dúvidas, sugestões ou quer uma demonstração personalizada? Estamos aqui.
              </p>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Contact info */}
            <Reveal>
              <div className="space-y-8">
                {/* WhatsApp card */}
                <a
                  href="https://wa.me/5551996873989"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-5 p-6 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 hover:shadow-md transition-all duration-300 group"
                >
                  <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-800 text-lg">WhatsApp</p>
                    <p className="text-green-700 text-sm">(51) 99687-3989</p>
                    <p className="text-green-600 text-xs mt-1">Resposta rápida · Seg–Sex, 8h–18h</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-green-600 ml-auto group-hover:translate-x-1 transition-transform" />
                </a>

                {/* Instagram card */}
                <a
                  href="https://instagram.com/artflowbr"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-5 p-6 bg-pink-50 border border-pink-200 rounded-2xl hover:bg-pink-100 hover:shadow-md transition-all duration-300 group"
                >
                  <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <Instagram className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-pink-900 text-lg">Instagram</p>
                    <p className="text-pink-800 text-sm">@artflowbr</p>
                    <p className="text-pink-700 text-xs mt-1">Dicas diárias para artesãos</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-pink-600 ml-auto group-hover:translate-x-1 transition-transform" />
                </a>

                <div className="flex items-center gap-5 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">E-mail</p>
                    <p className="text-muted-foreground text-sm">fdorneles63@gmail.com</p>
                    <p className="text-muted-foreground text-xs mt-1">Respondemos em até 24h</p>
                  </div>
                </div>

                <div className="flex items-center gap-5 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <MapPin className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg">Localização</p>
                    <p className="text-muted-foreground text-sm">Porto Alegre, RS — Brasil</p>
                    <p className="text-muted-foreground text-xs mt-1">Atendemos todo o Brasil</p>
                  </div>
                </div>

                <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl hidden">
                  <p className="font-semibold text-foreground mb-2">Prefere uma demo ao vivo?</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Agende uma chamada e mostramos o ArtFlow funcionando com casos reais da sua área de atuação.
                  </p>
                  <a href="https://wa.me/5551996873989?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20ArtFlow." target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary hover:text-white transition-colors">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Agendar via WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Contact form */}
            <Reveal delay={150}>
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm space-y-6"
              >
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-foreground mb-2">
                    Nome completo *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-foreground mb-2">
                    E-mail *
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-foreground mb-2">
                    Mensagem *
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Como podemos te ajudar?"
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200 text-sm resize-none"
                  />
                </div>

                {formStatus === "sent" && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Mensagem enviada com sucesso! Entraremos em contato em breve.
                  </div>
                )}
                {formStatus === "error" && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    Ops! Algo deu errado. Tente novamente ou nos contate pelo WhatsApp.
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 font-medium shadow-sm hover:shadow-md transition-all duration-200 group"
                  disabled={formStatus === "sending" || formStatus === "sent"}
                >
                  {formStatus === "sending" ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando…
                    </span>
                  ) : formStatus === "sent" ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Enviado!
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      Enviar mensagem
                    </span>
                  )}
                </Button>
              </form>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════ CTA BANNER ══════════════ */}
      <section className="py-24 px-6 bg-gradient-to-br from-primary via-primary to-primary/80 text-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-bold mb-5">
              Pronto para transformar seu negócio?
            </h2>
            <p className="text-xl text-white/80 mb-10 leading-relaxed">
              Junte-se a centenas de artesãos que já organizam sua produção com o ArtFlow.
              Comece grátis hoje mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login?mode=signup">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-50 text-base px-10 h-13 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold">
                  Criar Conta Grátis
                </Button>
              </Link>
              <a href="https://wa.me/5551996873989" target="_blank" rel="noreferrer">
                <Button size="lg" variant="ghost" className="border border-white/50 text-white hover:bg-white/15 hover:text-white hover:border-white text-base px-10 h-13">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar no WhatsApp
                </Button>
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="bg-foreground text-white">
        {/* Main footer */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight">ArtFlow</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-xs">
                A plataforma completa para artesãos e pequenos produtores organizarem sua produção, prazos e faturamento.
              </p>
              {/* Social links */}
              <div className="flex gap-3">
                {[
                  { label: "WhatsApp", icon: MessageCircle, href: "https://wa.me/5551996873989" },
                  { label: "Instagram", icon: Instagram, href: "https://instagram.com/artflowbr" },
                  { label: "Email", icon: Mail, href: "mailto:fdorneles63@gmail.com" },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="w-9 h-9 bg-white/10 hover:bg-primary rounded-lg flex items-center justify-center transition-colors duration-200"
                  >
                    <social.icon className="w-4 h-4 text-white" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links columns */}
            {[
              {
                heading: "Produto",
                links: [
                  { label: "Kanban de Pedidos", href: "#funcionalidades" },
                  { label: "Controle de Estoque", href: "#funcionalidades" },
                  { label: "Calendário de Entregas", href: "#funcionalidades" },
                  { label: "Metas Financeiras", href: "#funcionalidades" },
                  { label: "Precificação", href: "#funcionalidades" },
                ],
              },
              {
                heading: "Empresa",
                links: [
                  { label: "Preços", href: "#preços" },
                  { label: "FAQ", href: "#faq" },
                  { label: "Contato", href: "#contato" },
                  { label: "WhatsApp", href: "https://wa.me/5551996873989" },
                ],
              },
              {
                heading: "Legal",
                links: [
                  { label: "Política de Privacidade", href: "#" },
                  { label: "Termos de Uso", href: "#" },
                  { label: "LGPD", href: "#" },
                ],
              },
            ].map((col) => (
              <div key={col.heading}>
                <h4 className="font-semibold text-white text-sm mb-5">{col.heading}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-white/60 hover:text-white text-sm transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">© {new Date().getFullYear()} ArtFlow. Feito com ❤️ para artesãos brasileiros.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-white/50 hover:text-white/80 text-xs transition-colors">Privacidade</a>
              <a href="#" className="text-white/50 hover:text-white/80 text-xs transition-colors">Termos</a>
              <a href="#" className="text-white/50 hover:text-white/80 text-xs transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════ ANIMATIONS ══════════════ */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Landing;
