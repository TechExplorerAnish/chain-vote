"use client";

import { Badge } from "@/components/ui/badge";
import { ElectionPhase, PHASE_LABELS, PHASE_BADGE_VARIANT } from "@/lib/types";

interface Props {
    phase: ElectionPhase;
}

export default function PhaseBadge({ phase }: Props) {
    return (
        <Badge variant={PHASE_BADGE_VARIANT[phase]}>
            {PHASE_LABELS[phase]}
        </Badge>
    );
}
