import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  GraduationCap,
  BookOpen,
  MessageSquare,
  FileCheck2,
  FileText,
  Users,
  Smartphone,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  ExternalLink,
  Ticket,
  BarChart3,
  Bell,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo-catech.png";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | undefined;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | undefined;
}

interface DashboardSidebarProps {
  activeView: string;
  onViewChange: (viewId: string) => void;
  userRole: "company" | "student" | "super_admin";
  onRoleSwitch?: (role: "company" | "student" | "super_admin") => void;
  selectedCompany?: { id: string; name: string; code: string } | null;
  onSelectCompanyClick?: () => void;
  displayName: string;
  isPlatformAdmin?: boolean;
  hasCompanyAccess?: boolean;
  unreadCount?: number;
}

export function DashboardSidebar({
  activeView,
  onViewChange,
  userRole,
  onRoleSwitch,
  selectedCompany,
  onSelectCompanyClick,
  displayName,
  isPlatformAdmin,
  hasCompanyAccess,
  unreadCount = 0,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  // Load persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("catech_sidebar_collapsed");
      if (stored === "true") setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("catech_sidebar_collapsed", String(next));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("catech_active_role");
      localStorage.removeItem("catech_selected_company_id");
    }
    void navigate({ to: "/auth", replace: true });
  };

  // Nav items based on role
  const studentNavItems: NavItem[] = [
    {
      id: "my_learning",
      label: "My Learning Progress",
      icon: GraduationCap,
      badge: "Active",
      badgeVariant: "secondary",
    },
    {
      id: "sessions",
      label: "Course Sessions",
      icon: BookOpen,
      badge: "M-Pesa",
      badgeVariant: "outline",
    },
    {
      id: "assignments",
      label: "Tasks & Study Notes",
      icon: FileCheck2,
    },
    {
      id: "messages",
      label: "Messages with Company",
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeVariant: "destructive",
    },
    {
      id: "payments",
      label: "M-Pesa Receipts",
      icon: Smartphone,
    },
    {
      id: "my_issues",
      label: "Support Issues",
      icon: Ticket,
    },
    {
      id: "profile",
      label: "Student Profile",
      icon: Settings,
    },
  ];

  const companyNavItems: NavItem[] = [
    {
      id: "company_overview",
      label: "Company Dashboard",
      icon: Building2,
    },
    {
      id: "company_learners",
      label: "Students & Contacts",
      icon: Users,
      badge: "Directory",
      badgeVariant: "secondary",
    },
    {
      id: "company_courses",
      label: "Course Sessions",
      icon: BookOpen,
    },
    {
      id: "company_assignments",
      label: "Assignments & Notes",
      icon: FileCheck2,
    },
    {
      id: "messages",
      label: "Direct Messages",
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeVariant: "destructive",
    },
    {
      id: "company_live",
      label: "Live Virtual Classes",
      icon: Sparkles,
    },
    {
      id: "company_payments",
      label: "M-Pesa Collections",
      icon: Smartphone,
    },
    {
      id: "company_settings",
      label: "Company Settings",
      icon: Settings,
    },
  ];

  const superAdminNavItems: NavItem[] = [
    {
      id: "platform_control",
      label: "System Governance",
      icon: Shield,
      badge: "Root",
      badgeVariant: "destructive",
    },
    {
      id: "platform_issues",
      label: "Support Issues",
      icon: Ticket,
    },
    {
      id: "company_overview",
      label: "Companies Dashboard",
      icon: Building2,
    },
    {
      id: "company_learners",
      label: "Global Users",
      icon: Users,
    },
    {
      id: "company_courses",
      label: "All Sessions",
      icon: BookOpen,
    },
    {
      id: "messages",
      label: "Platform Messages",
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeVariant: "destructive",
    },
    {
      id: "company_payments",
      label: "Global M-Pesa Ledger",
      icon: Smartphone,
    },
    {
      id: "rbac_management",
      label: "RBAC & Permissions",
      icon: Layers,
    },
    {
      id: "profile",
      label: "Admin Profile",
      icon: Settings,
    },
  ];

  const currentNavItems =
    userRole === "super_admin"
      ? superAdminNavItems
      : userRole === "company"
        ? companyNavItems
        : studentNavItems;

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-card/95 text-card-foreground border-r border-border/80 backdrop-blur-xl">
      {/* Top Header / Brand */}
      <div>
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 overflow-hidden transition-all ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
              <img src={logoImg} alt="CATECH" className="h-6 w-6 object-contain" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  CATECH <span className="text-primary font-black">Learn</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                  {userRole === "company"
                    ? "Company Portal"
                    : userRole === "super_admin"
                      ? "Super Admin"
                      : "Student Workspace"}
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company Active Selector Badge (Only for Student and Company Roles) */}
        {!collapsed && userRole !== "super_admin" ? (
          <div className="m-3 p-3 rounded-xl bg-muted/60 border border-border/70">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3 text-primary" /> Active Company
              </span>
              <button
                type="button"
                onClick={onSelectCompanyClick}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Switch
              </button>
            </div>
            <div className="font-bold text-sm text-foreground truncate">
              {selectedCompany ? selectedCompany.name : "No Company Selected"}
            </div>
            {selectedCompany ? (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span>Code: {selectedCompany.code}</span>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-amber-600 font-medium">
                Choose a company to access sessions & pay
              </p>
            )}
          </div>
        ) : !collapsed && userRole === "super_admin" ? (
          <div className="m-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-bold text-xs text-foreground uppercase tracking-wider">
                Root System Admin
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Full oversight across all partner companies & learner records.
            </p>
          </div>
        ) : null}

        {collapsed && userRole !== "super_admin" && (
          <div className="flex justify-center my-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onSelectCompanyClick}
                    className="p-2.5 rounded-lg bg-muted/60 hover:bg-muted text-primary"
                    aria-label="Switch Company"
                  >
                    <Building2 className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-bold text-xs">
                    {selectedCompany ? selectedCompany.name : "Select Company"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Click to switch</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Role Quick Toggle - Super Admin never has the student workspace */}
        {onRoleSwitch && !collapsed && (
          <div className="px-3 mb-2">
            {isPlatformAdmin ? (
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/70 rounded-xl text-[11px] font-semibold border border-border/60">
                <button
                  type="button"
                  onClick={() => onRoleSwitch("super_admin")}
                  className={`py-1.5 px-1 rounded-lg transition-all text-center truncate ${
                    userRole === "super_admin"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Super Admin Platform Governance"
                >
                  🛡️ System Admin
                </button>
                <button
                  type="button"
                  onClick={() => onRoleSwitch("company")}
                  className={`py-1.5 px-1 rounded-lg transition-all text-center truncate ${
                    userRole === "company"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Company Manager View"
                >
                  🏢 Company View
                </button>
              </div>
            ) : hasCompanyAccess ? (
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/70 rounded-xl text-[11px] font-semibold border border-border/60">
                <button
                  type="button"
                  onClick={() => onRoleSwitch("student")}
                  className={`py-1.5 px-1 rounded-lg transition-all text-center truncate ${
                    userRole === "student"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Student Workspace"
                >
                  🎓 Student
                </button>
                <button
                  type="button"
                  onClick={() => onRoleSwitch("company")}
                  className={`py-1.5 px-1 rounded-lg transition-all text-center truncate ${
                    userRole === "company"
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Company Portal"
                >
                  🏢 Company
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1 px-2.5 py-2">
          <TooltipProvider delayDuration={150}>
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <div key={item.id}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => {
                            onViewChange(item.id);
                            setMobileOpen(false);
                          }}
                          className={`w-full flex justify-center items-center py-2.5 px-2 rounded-xl transition-all relative ${
                            isActive
                              ? "bg-primary text-primary-foreground font-bold shadow-md"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          }`}
                          aria-label={item.label}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          {item.badge !== undefined && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-semibold text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onViewChange(item.id);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge
                          variant={isActive ? "secondary" : item.badgeVariant || "secondary"}
                          className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-wider"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </TooltipProvider>
        </nav>
      </div>

      {/* Bottom Footer: User Info & Collapse Toggle */}
      <div className="border-t border-border/70 p-3 bg-muted/30">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                  {displayName ? displayName.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-foreground truncate">
                    {displayName || "Active User"}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {userRole === "company" ? "Company Manager" : "Student Scholar"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleCollapsed}
              className="w-full justify-between text-xs h-8 border-border/70"
            >
              <span>Collapse Side Nav</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleCollapsed}
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Expand sidebar"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand Side Nav</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar with Hamburger Toggle */}
      <div className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border/70 bg-card/90 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="text-foreground"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="CATECH" className="h-6 w-auto object-contain" />
            <span className="font-extrabold text-sm tracking-tight">CATECH Learn</span>
          </div>
        </div>

        {selectedCompany && (
          <Badge variant="outline" className="text-[11px] truncate max-w-[140px]">
            {selectedCompany.name}
          </Badge>
        )}
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col shadow-2xl">
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Collapsible) */}
      <aside
        className={`hidden md:block shrink-0 transition-all duration-300 ease-in-out sticky top-0 h-screen ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {renderNavContent()}
      </aside>
    </>
  );
}
