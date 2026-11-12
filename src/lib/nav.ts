import type { CopyKey } from "./i18n";
import {
  Activity,
  Bell,
  Brain,
  Building2,
  CalendarDays,
  CircleHelp,
  FileText,
  Flame,
  GitCompare,
  Globe,
  LayoutDashboard,
  LineChart,
  Link2,
  Lock,
  Mail,
  Map,
  PenLine,
  Scale,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";

export const NAV = [
  {
    group: "groupListen" as CopyKey,
    items: [
      { to: "/insights", key: "navOverview" as CopyKey, icon: LayoutDashboard, exact: true },
      { to: "/insights/heatmap", key: "navHeat" as CopyKey, icon: Map, exact: false },
      { to: "/insights/trends", key: "navTrends" as CopyKey, icon: LineChart, exact: false },
      { to: "/insights/drivers", key: "navDrivers" as CopyKey, icon: Activity, exact: false },
      { to: "/insights/departments", key: "navDepts" as CopyKey, icon: Building2, exact: false },
    ],
  },
  {
    group: "groupLead" as CopyKey,
    items: [
      { to: "/insights/executive", key: "navExec" as CopyKey, icon: FileText, exact: false },
      { to: "/insights/actions", key: "navActions" as CopyKey, icon: Flame, exact: false },
      { to: "/insights/ai", key: "navAi" as CopyKey, icon: Sparkles, exact: false },
      { to: "/insights/benchmarks", key: "navBench" as CopyKey, icon: Scale, exact: false },
      { to: "/insights/compare", key: "navCompare" as CopyKey, icon: GitCompare, exact: false },
    ],
  },
  {
    group: "groupRun" as CopyKey,
    items: [
      { to: "/insights/invitations", key: "navInvite" as CopyKey, icon: Mail, exact: false },
      { to: "/insights/reminders", key: "navRemind" as CopyKey, icon: Bell, exact: false },
      { to: "/insights/design", key: "navDesign" as CopyKey, icon: PenLine, exact: false },
      { to: "/insights/reports", key: "navReports" as CopyKey, icon: Brain, exact: false },
      { to: "/faq", key: "faq" as CopyKey, icon: CircleHelp, exact: false },
    ],
  },
] as const;

export const SETTINGS_NAV = [
  { to: "/settings", key: "setGeneral" as CopyKey, icon: SlidersHorizontal, exact: true },
  { to: "/settings/users", key: "setUsers" as CopyKey, icon: Users, exact: false },
  { to: "/settings/departments", key: "setDepts" as CopyKey, icon: Building2, exact: false },
  { to: "/settings/builder", key: "setBuilder" as CopyKey, icon: PenLine, exact: false },
  { to: "/settings/email", key: "setEmail" as CopyKey, icon: Mail, exact: false },
  { to: "/settings/reminders", key: "setRemind" as CopyKey, icon: Bell, exact: false },
  { to: "/settings/anonymity", key: "setAnon" as CopyKey, icon: Shield, exact: false },
  { to: "/settings/branding", key: "setBrand" as CopyKey, icon: Globe, exact: false },
  { to: "/settings/integrations", key: "setIntegrations" as CopyKey, icon: Link2, exact: false },
  { to: "/settings/benchmarks", key: "setBench" as CopyKey, icon: Scale, exact: false },
  { to: "/settings/calendar", key: "setCal" as CopyKey, icon: CalendarDays, exact: false },
  { to: "/settings/danger", key: "setDanger" as CopyKey, icon: TriangleAlert, exact: false },
] as const;

export { Settings2, Lock };
