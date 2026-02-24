"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ElectionOverview({ election, electionPda }: Props) {
    const { voterCount, committedCount, revealedCount, loading } = useRegisteredVoters(electionPda);

    const now = Math.floor(Date.now() / 1000);
    const startSec = Number(election.startTime);
    const endSec = Number(election.endTime);

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">{election.title}</CardTitle>
                <PhaseBadge phase={election.phase} />
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
                    <div>
                        <p className="text-muted-foreground">Registered Voters</p>
                        <p className="font-semibold">
                            {loading ? "..." : voterCount}
                        </p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Candidates</p>
                        <p className="font-semibold">{election.candidateCount}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Committed</p>
                        <p className="font-semibold">{election.totalCommittedVotes.toString()}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Revealed</p>
                        <p className="font-semibold">{election.totalRevealedVotes.toString()}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Tally Root</p>
                        <p className="font-semibold">
                            {election.finalTallyRootSet ? "Published" : "Pending"}
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-4">
                    {election.phase === ElectionPhase.VotingPhase && (
                        <>
                            {now < startSec && (
                                <Countdown
                                    targetTime={election.startTime}
                                    label="Voting starts in"
                                />
                            )}
                            <Countdown
                                targetTime={election.endTime}
                                label="Voting ends in"
                            />
                        </>
                    )}
                    {election.phase === ElectionPhase.Created && (
                        <Countdown
                            targetTime={election.startTime}
                            label="Starts in"
                        />
                    )}
                    {(election.phase === ElectionPhase.RevealPhase ||
                        election.phase === ElectionPhase.Finalized) && (
                            <div className="text-sm text-muted-foreground">
                                <span>Voting ended: </span>
                                <span className="font-mono">
                                    {new Date(endSec * 1000).toLocaleString()}
                                </span>
                            </div>
                        )}
                </div>

                {election.finalTallyRootSet && election.proofUri && (
                    <>
                        <Separator />
                        <div className="text-sm">
                            <p className="text-muted-foreground">Proof URI</p>
                            <a
                                href={election.proofUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-4"
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
