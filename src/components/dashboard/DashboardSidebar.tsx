import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  GraduationCap,
  BookOpen,
  MessageSquare,
  FileCheck2,
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
  Ticket,
  Sliders,
  Award,
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

export type RoleType = "super_admin" | "institution_admin" | "teacher" | "student" | "company";

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
  userRole: RoleType;
  onRoleSwitch?: (role: RoleType) => void;
  selectedCompany?: { id: string; name: string; code: string } | null;
  onSelectCompanyClick?: () => void;
  displayName: string;
  isPlatformAdmin?: boolean;
  hasCompanyAccess?: boolean;
  hasTeacherAccess?: boolean;
  unreadCount?: number;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
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
  hasTeacherAccess,
  unreadCount = 0,
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange,
}: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const navigate = useNavigate();

  const isMobileOpen = controlledMobileOpen !== undefined ? controlledMobileOpen : internalMobileOpen;
  const setMobileOpen = (open: boolean) => {
    if (onMobileOpenChange) {
      onMobileOpenChange(open);
    } else {
      setInternalMobileOpen(open);
    }
  };

  // Load sidebar collapsed state
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

  // 1. Student Navigation (clean, learner-focused)
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
      label: "Browse Sessions",
      icon: BookOpen,
      badge: "M-Pesa",
      badgeVariant: "outline",
    },
    {
      id: "select_company",
      label: "Partner Institutions",
      icon: Building2,
    },
    {
      id: "assignments",
      label: "Coursework & Tasks",
      icon: FileCheck2,
    },
    {
      id: "messages",
      label: "Messages",
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
      label: "Support Tickets",
      icon: Ticket,
    },
    {
      id: "profile",
      label: "Student Profile",
      icon: Settings,
    },
  ];

  // 2. Teacher Navigation (curriculum, modules, lessons, grading, learners)
  const teacherNavItems: NavItem[] = [
    {
      id: "teacher_overview",
      label: "Faculty Workspace",
      icon: Sparkles,
    },
    {
      id: "teacher_courses",
      label: "Assigned Sessions",
      icon: BookOpen,
    },
    {
      id: "teacher_grading",
      label: "Assignments & Grading",
      icon: FileCheck2,
    },
    {
      id: "teacher_learners",
      label: "Enrolled Learners",
      icon: Users,
    },
    {
      id: "messages",
      label: "Student Messages",
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeVariant: "destructive",
    },
    {
      id: "profile",
      label: "Teacher Profile",
      icon: Settings,
    },
  ];

  // 3. Company Admin Navigation (company profile, sessions, staff, students, materials, assignments, payments)
  const companyNavItems: NavItem[] = [
    {
      id: "company_overview",
      label: "Company Dashboard",
      icon: Building2,
    },
    {
      id: "company_courses",
      label: "Course Sessions",
      icon: BookOpen,
    },
    {
      id: "company_learners",
      label: "Students & Contacts",
      icon: Users,
    },
    {
      id: "company_assignments",
      label: "Module Assignments",
      icon: FileCheck2,
    },
    {
      id: "company_payments",
      label: "M-Pesa Collections",
      icon: Smartphone,
    },
    {
      id: "messages",
      label: "Direct Messages",
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : undefined,
      badgeVariant: "destructive",
    },
    {
      id: "company_settings",
      label: "Company Profile",
      icon: Settings,
    },
  ];

  // 4. Super Admin Navigation (all users, companies, accounts, permissions, subscriptions, payments, system activity)
  const superAdminNavItems: NavItem[] = [
    {
      id: "platform_control",
      label: "System Governance",
      icon: Shield,
      badge: "Root",
      badgeVariant: "destructive",
    },
    {
      id: "company_overview",
      label: "All Companies",
      icon: Building2,
    },
    {
      id: "company_learners",
      label: "Platform Users",
      icon: Users,
    },
    {
      id: "company_courses",
      label: "Global Sessions",
      icon: BookOpen,
    },
    {
      id: "company_payments",
      label: "M-Pesa Ledger",
      icon: Smartphone,
    },
    {
      id: "platform_issues",
      label: "Support Tickets",
      icon: Ticket,
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

  // Determine current nav items strictly based on active user role
  const normalizedRole = userRole === "company" ? "institution_admin" : userRole;
  const currentNavItems =
    normalizedRole === "super_admin"
      ? superAdminNavItems
      : normalizedRole === "institution_admin"
        ? companyNavItems
        : normalizedRole === "teacher"
          ? teacherNavItems
          : studentNavItems;

  const roleLabel =
    normalizedRole === "super_admin"
      ? "Super Admin"
      : normalizedRole === "institution_admin"
        ? "Company Admin"
        : normalizedRole === "teacher"
          ? "Faculty Teacher"
          : "Student Scholar";

  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-card text-card-foreground border-r border-border/80">
      {/* Brand & Header */}
      <div>
        <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 overflow-hidden transition-all ${
              collapsed ? "justify-center w-full" : ""
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <img src={logoImg} alt="CATECH" className="h-6 w-6 object-contain" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-black text-sm tracking-tight text-foreground flex items-center gap-1.5">
                  CATECH <span className="text-primary font-black">Learn</span>
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  {roleLabel}
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

        {/* Role Pill & Company Badge */}
        {!collapsed && (
          <div className="m-3 p-3 rounded-2xl bg-muted/40 border border-border/70">
            <div className="flex items-center justify-between text-xs mb-1">
              <Badge
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 ${
                  normalizedRole === "super_admin"
                    ? "bg-destructive/15 text-destructive border-destructive/20"
                    : normalizedRole === "institution_admin"
                      ? "bg-primary/15 text-primary border-primary/20"
                      : normalizedRole === "teacher"
                        ? "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20"
                        : "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/20"
                }`}
              >
                {roleLabel}
              </Badge>

              {normalizedRole === "student" && onSelectCompanyClick && (
                <button
                  type="button"
                  onClick={onSelectCompanyClick}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Switch
                </button>
              )}
            </div>

            {normalizedRole !== "super_admin" ? (
              <div className="mt-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-primary" /> Active Company
                </p>
                <p className="font-bold text-xs text-foreground truncate mt-0.5">
                  {selectedCompany ? selectedCompany.name : "Select an institution"}
                </p>
                {selectedCompany?.code && (
                  <p className="text-[10px] font-mono text-emerald-600 font-medium">
                    Code: {selectedCompany.code}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1">
                Full root oversight across all partner organizations & learners.
              </p>
            )}
          </div>
        )}

        {/* Collapsed Company Indicator */}
        {collapsed && selectedCompany && normalizedRole !== "super_admin" && (
          <div className="flex justify-center my-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onSelectCompanyClick}
                    className="p-2 rounded-xl bg-muted/60 text-primary hover:bg-muted"
                  >
                    <Building2 className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-bold text-xs">{selectedCompany.name}</p>
                  <p className="text-[10px] text-muted-foreground">Click to switch</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Multi-role context switcher (ONLY for authorized admins / teachers) */}
        {!collapsed && onRoleSwitch && (isPlatformAdmin || hasCompanyAccess) && (
          <div className="px-3 mb-2">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">
              Active Context
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 text-[11px] font-semibold">
              {isPlatformAdmin && (
                <button
                  type="button"
                  onClick={() => onRoleSwitch("super_admin")}
                  className={`py-1 px-2 rounded-lg transition-all text-center truncate ${
                    normalizedRole === "super_admin"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛡️ Admin
                </button>
              )}
              {hasCompanyAccess && (
                <button
                  type="button"
                  onClick={() => onRoleSwitch("company")}
                  className={`py-1 px-2 rounded-lg transition-all text-center truncate ${
                    normalizedRole === "institution_admin"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🏢 Company
                </button>
              )}
              {hasTeacherAccess && (
                <button
                  type="button"
                  onClick={() => onRoleSwitch("teacher")}
                  className={`py-1 px-2 rounded-lg transition-all text-center truncate ${
                    normalizedRole === "teacher"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  👨‍🏫 Teacher
                </button>
              )}
              <button
                type="button"
                onClick={() => onRoleSwitch("student")}
                className={`py-1 px-2 rounded-lg transition-all text-center truncate ${
                  normalizedRole === "student"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                🎓 Student
              </button>
            </div>
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
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                          }`}
                          aria-label={item.label}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.badge !== undefined && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-bold text-xs">{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onViewChange(item.id);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <Badge
                          variant={isActive ? "secondary" : item.badgeVariant || "default"}
                          className={`text-[10px] h-4.5 px-1.5 font-bold ${
                            isActive ? "bg-white/20 text-white" : ""
                          }`}
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

      {/* Footer / User Profile & Collapse Toggle */}
      <div className="p-3 border-t border-border/70 space-y-2">
        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={`w-full text-xs text-muted-foreground hover:text-foreground flex items-center ${
              collapsed ? "justify-center p-2" : "justify-between px-2.5"
            }`}
          >
            {!collapsed && <span className="font-semibold text-[11px]">Collapse Menu</span>}
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* User Card */}
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/60 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
            {displayName ? displayName.charAt(0).toUpperCase() : "U"}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{displayName || "User"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
            </div>
          )}

          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 rounded-lg"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center pt-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
              className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 transition-all duration-200 border-r border-border/80 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {renderNavContent()}
      </aside>

      {/* 2. Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
}
