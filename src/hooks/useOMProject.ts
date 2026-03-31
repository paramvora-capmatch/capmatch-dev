import { useParams } from "next/navigation";

import { useProjects } from "@/hooks/useProjects";
import { type DealType } from "@/lib/deal-type-field-config";
import { getOMDealType, shouldShowDealTypeCard } from "@/lib/om-display";

type OMContent = Record<string, any> | null | undefined;

export function useOMProject() {
  const params = useParams();
  const projectId = typeof params?.id === "string" ? params.id : "";
  const { getProject } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const dealType = getOMDealType(project);

  const shouldShowProjectCard = (fieldIds: string[], content?: OMContent) =>
    shouldShowDealTypeCard(fieldIds, dealType, content, true);

  const shouldShowBorrowerCard = (fieldIds: string[], content?: OMContent) =>
    shouldShowDealTypeCard(fieldIds, dealType, content, false);

  return {
    projectId,
    project,
    dealType: dealType as DealType,
    isGroundUp: dealType === "ground_up",
    isRefinance: dealType === "refinance",
    shouldShowProjectCard,
    shouldShowBorrowerCard,
  };
}
