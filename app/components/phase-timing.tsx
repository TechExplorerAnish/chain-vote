"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ElectionPhase, PHASE_LABELS } from "@/lib/types";
import type { ElectionAccount } from "@/lib/types";

interface Props {
    election: ElectionAccount;
}

export default function PhaseTiming({ election }: Props) {
    const now = Math.floor(Date.now() / 1000);
    const startSec = Number(election.startTime);
    const endSec = Number(election.endTime);

    const isBeforeStart = now < startSec;
    const isAfterEnd = now > endSec;
    const isActive = !isBeforeStart && !isAfterEnd;

    // Calculate phase durations (assuming equal distribution)
    // RegistrationPhase: from creation to startTime
    // VotingPhase: from startTime to endTime  
    // RevealPhase: from endTime onwards (no specific end time in contract)

    const formatDateTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString();
    };

    const formatDuration = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const getPhaseStatus = (phaseType: ElectionPhase) => {
        if (election.phase === phaseType) return "active";
        if (election.phase > phaseType) return "completed";
        return "pending";
    };

    const registrationDuration = startSec - Math.floor(Date.now() / 1000);
    const votingDuration = endSec - startSec;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Election Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    {/* Registration Phase */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Registration Phase</span>
                                <Badge
                                    variant={
                                        getPhaseStatus(ElectionPhase.RegistrationPhase) === "active"
                                            ? "default"
                                            : getPhaseStatus(ElectionPhase.RegistrationPhase) === "completed"
                                                ? "secondary"
                                                : "outline"
                                    }
                                >
                                    {getPhaseStatus(ElectionPhase.RegistrationPhase) === "active"
                                        ? "Active"
                                        : getPhaseStatus(ElectionPhase.RegistrationPhase) === "completed"
                                            ? "Completed"
                                            : "Pending"}
                                </Badge>
                            </div>
                            {election.phase === ElectionPhase.RegistrationPhase && registrationDuration > 0 && (
                                <span className="text-sm text-amber-600 font-medium">
                                    Ends in {formatDuration(registrationDuration)}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pl-2">
                            <p>Start: Now (when phase transitions from Created)</p>
                            <p>End: {formatDateTime(startSec)}</p>
                            <p>Duration: ~{formatDuration(registrationDuration > 0 ? registrationDuration : startSec - Math.floor(Date.now() / 1000))}</p>
                        </div>
                    </div>

                    {/* Voting Phase */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Voting Phase</span>
                                <Badge
                                    variant={
                                        getPhaseStatus(ElectionPhase.VotingPhase) === "active"
                                            ? "default"
                                            : getPhaseStatus(ElectionPhase.VotingPhase) === "completed"
                                                ? "secondary"
                                                : "outline"
                                    }
                                >
                                    {getPhaseStatus(ElectionPhase.VotingPhase) === "active"
                                        ? "Active"
                                        : getPhaseStatus(ElectionPhase.VotingPhase) === "completed"
                                            ? "Completed"
                                            : "Pending"}
                                </Badge>
                            </div>
                            {election.phase === ElectionPhase.VotingPhase && endSec > now && (
                                <span className="text-sm text-amber-600 font-medium">
                                    Ends in {formatDuration(endSec - now)}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pl-2">
                            <p>Start: {formatDateTime(startSec)}</p>
                            <p>End: {formatDateTime(endSec)}</p>
                            <p>Duration: {formatDuration(votingDuration)}</p>
                        </div>
                    </div>

                    {/* Reveal Phase */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Reveal Phase</span>
                                <Badge
                                    variant={
                                        getPhaseStatus(ElectionPhase.RevealPhase) === "active"
                                            ? "default"
                                            : getPhaseStatus(ElectionPhase.RevealPhase) === "completed"
                                                ? "secondary"
                                                : "outline"
                                    }
                                >
                                    {getPhaseStatus(ElectionPhase.RevealPhase) === "active"
                                        ? "Active"
                                        : getPhaseStatus(ElectionPhase.RevealPhase) === "completed"
                                            ? "Completed"
                                            : "Pending"}
                                </Badge>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pl-2">
                            <p>Start: {formatDateTime(endSec)}</p>
                            <p>End: Admin-determined (via governance)</p>
                            <p>Duration: Admin-configurable</p>
                        </div>
                    </div>

                    {/* Finalized Phase */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Finalized</span>
                                <Badge
                                    variant={
                                        election.phase === ElectionPhase.Finalized
                                            ? "default"
                                            : election.phase > ElectionPhase.Finalized
                                                ? "secondary"
                                                : "outline"
                                    }
                                >
                                    {election.phase === ElectionPhase.Finalized ? "Active" : "Pending"}
                                </Badge>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 pl-2">
                            <p>Start: After Reveal Phase ends</p>
                            <p>Marks election as complete</p>
                        </div>
                    </div>
                </div>

                {/* Current Status */}
                <Alert className="mt-4">
                    <AlertDescription>
                        <strong>Current Phase:</strong> {PHASE_LABELS[election.phase]} •{" "}
                        <strong>Current Time:</strong> {formatDateTime(now)}
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
