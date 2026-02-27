"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PhaseBadge from "@/components/phase-badge";
import Countdown from "@/components/countdown";
import type { ElectionAccount } from "@/lib/types";
import { ElectionPhase } from "@/lib/types";
import { useRegisteredVoters } from "@/hooks/use-registered-voters";

interface Props {
    election: ElectionAccount;
    electionPda?: string;
}

const STAT_ICONS: Record<string, string> = {
    voters: "👥",
    candidates: "🎯",
    committed: "🔒",
    revealed: "🔓",
    tally: "📊",
};

export default function ElectionOverview({ election, electionPda }: Props) {
    const [mounted, setMounted] = useState(false);
    const [now, setNow] = useState(0);

    useEffect(() => {
        setNow(Math.floor(Date.now() / 1000));
        setMounted(true);
    }, []);

    const { voterCount, loading } = useRegisteredVoters(electionPda);

    const startSec = Number(election.startTime);
    const endSec = Number(election.endTime);

    const stats = [
        { key: "voters", label: "Voters", value: loading ? "…" : String(voterCount), icon: STAT_ICONS.voters },
        { key: "candidates", label: "Candidates", value: String(election.candidateCount), icon: STAT_ICONS.candidates },
        { key: "committed", label: "Committed", value: election.totalCommittedVotes.toString(), icon: STAT_ICONS.committed },
        { key: "revealed", label: "Revealed", value: election.totalRevealedVotes.toString(), icon: STAT_ICONS.revealed },
        { key: "tally", label: "Tally", value: election.finalTallyRootSet ? "Published" : "Pending", icon: STAT_ICONS.tally },
    ];

    return (
        <Card>
            <CardContent className="space-y-5 pt-6">
                {/* Title + phase + countdown row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">{election.title}</h1>
                        <div className="flex items-center gap-2">
                            <PhaseBadge phase={election.phase} />
                            {election.phase === ElectionPhase.VotingPhase && (
                                <Countdown
                                    targetTime={election.endTime}
                                    label="ends"
                                />
                            )}
                            {election.phase === ElectionPhase.Created && mounted && now < startSec && (
                                <Countdown
                                    targetTime={election.startTime}
                                    label="starts"
                                />
                            )}
                            {(election.phase === ElectionPhase.RevealPhase ||
                                election.phase === ElectionPhase.Finalized) && (
                                    <span className="text-xs text-muted-foreground">
                                        Ended {new Date(endSec * 1000).toLocaleDateString()}
                                    </span>
                                )}
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {stats.map((s) => (
                        <div key={s.key} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                            <span className="text-lg">{s.icon}</span>
                            <div>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                <p className="text-sm font-semibold">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Proof */}
                {election.finalTallyRootSet && election.proofUri && (
                    <>
                        <Separator />
                        <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">Proof</Badge>
                            <a
                                href={election.proofUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate underline underline-offset-4"
                            >
                                {election.proofUri}
                            </a>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
