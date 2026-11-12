import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/store";
import type { ActionPlan, InvitationCampaign } from "@/lib/types";

export function PlanBadge({ status }: { status: ActionPlan["status"] }) {
  const { t } = useT();
  if (status === "done") return <Badge tone="high">{t("statusDone")}</Badge>;
  if (status === "in-motion") return <Badge tone="accent">{t("statusMotion")}</Badge>;
  return <Badge tone="sand">{t("statusProposed")}</Badge>;
}

export function CampaignBadge({ status }: { status: InvitationCampaign["status"] }) {
  const { t } = useT();
  if (status === "sent") return <Badge tone="high">{t("sent")}</Badge>;
  if (status === "scheduled") return <Badge tone="mid">{t("scheduled")}</Badge>;
  return <Badge tone="sand">{t("draft")}</Badge>;
}
