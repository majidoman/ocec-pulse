import type { CopyKey } from "./i18n";
import {
  Activity,
  Bell,
  Brain,
  Building2,
  CircleHelp,
  FileText,
  Flame,
  GitCompare,
  Globe,
  History,
  Palette,
  Paperclip,
  Layers,
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
      { to: "/insights/departments", key: "navDepts" as CopyKey, icon: Building2, exact: false, also: ["/insights/heatmap"] },
      { to: "/insights/trends", key: "navCompareAll" as CopyKey, icon: LineChart, exact: false, also: ["/insights/compare", "/insights/benchmarks"] },
      { to: "/insights/files", key: "navFiles" as CopyKey, icon: Paperclip, exact: false, onlyWithFiles: true },
    ],
  },
  {
    group: "groupLead" as CopyKey,
    items: [
      { to: "/insights/drivers", key: "navFocus" as CopyKey, icon: Flame, exact: false, also: ["/insights/actions"] },
      { to: "/insights/executive", key: "navReportsAll" as CopyKey, icon: FileText, exact: false, also: ["/insights/ai", "/insights/reports", "/insights/design"] },
    ],
  },
  {
    group: "groupRun" as CopyKey,
    items: [{ to: "/insights/invitations", key: "navInviteAll" as CopyKey, icon: Mail, exact: false, also: ["/insights/reminders"] }],
  },
] as const;

export const SETTINGS_NAV = [
  { to: "/settings", key: "setGeneral" as CopyKey, icon: SlidersHorizontal, exact: true },
  { to: "/settings/users", key: "setUsers" as CopyKey, icon: Users, exact: false },
  { to: "/settings/departments", key: "setDepts" as CopyKey, icon: Building2, exact: false },
  { to: "/settings/surveys", key: "setSurveyArea" as CopyKey, icon: Layers, exact: false, also: ["/settings/builder", "/settings/appearance"] },
  { to: "/settings/email", key: "setEmail" as CopyKey, icon: Mail, exact: false },
  { to: "/settings/reminders", key: "setRemind" as CopyKey, icon: Bell, exact: false },
  { to: "/settings/anonymity", key: "setAnon" as CopyKey, icon: Shield, exact: false },
  { to: "/settings/branding", key: "setBrand" as CopyKey, icon: Globe, exact: false },
  { to: "/settings/integrations", key: "setIntegrations" as CopyKey, icon: Link2, exact: false },
  { to: "/settings/benchmarks", key: "setBench" as CopyKey, icon: Scale, exact: false },
  { to: "/settings/history", key: "setHistory" as CopyKey, icon: History, exact: false },
  { to: "/settings/danger", key: "setDanger" as CopyKey, icon: TriangleAlert, exact: false },
] as const;

export { Settings2, Lock };
