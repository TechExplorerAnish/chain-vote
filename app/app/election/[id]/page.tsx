"use client";

import { useParams } from "next/navigation";
import { useElectionAccount } from "@/hooks/use-election-account";
import { useVoterStatus } from "@/hooks/use-voter-status";
import { useElectionEvents } from "@/hooks/use-event-subscription";
import ElectionOverview from "@/components/election-overview";
import CandidateList from "@/components/candidate-list";
import CommitForm from "@/components/commit-form";
import RevealForm from "@/components/reveal-form";
import ResultsTable from "@/components/results-table";
import ElectionSkeleton from "@/components/election-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ElectionPhase } from "@/lib/types";

export default function ElectionPage() {
    const params = useParams<{ id: string }>();
    const adminKey = params.id;

    const {
        election,
        candidates,
        loading,
        error,
        refetch,
    } = useElectionAccount(adminKey);

    const voterStatus = useVoterStatus(adminKey);

    // Subscribe to live events and refetch on changes
    useElectionEvents(!!election);

    if (loading) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 p-6">
                <ElectionSkeleton />
            </div>
        );
    }

    if (error || !election) {
        return (
            <div className="mx-auto max-w-4xl p-6">
                <Alert variant="destructive">
                    <AlertDescription>
                        {error ?? "Election not found. Check the admin public key."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const showCommit = election.phase === ElectionPhase.VotingPhase;
    const showReveal = election.phase === ElectionPhase.RevealPhase;
    const showResults =
        election.phase === ElectionPhase.RevealPhase ||
        election.phase === ElectionPhase.Finalized;

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <ElectionOverview election={election} electionPda={adminKey} />

            <Tabs defaultValue="candidates">
                <TabsList>
                    <TabsTrigger value="candidates">Candidates</TabsTrigger>
                    {showCommit && <TabsTrigger value="vote">Vote</TabsTrigger>}
                    {showReveal && <TabsTrigger value="reveal">Reveal</TabsTrigger>}
                    {showResults && <TabsTrigger value="results">Results</TabsTrigger>}
                </TabsList>

                <TabsContent value="candidates" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Registered Candidates</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CandidateList candidates={candidates} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {showCommit && (
                    <TabsContent value="vote" className="mt-4">
                        <CommitForm
                            adminKey={adminKey}
                            candidates={candidates}
                            isWhitelisted={voterStatus.isWhitelisted}
                            hasCommitted={voterStatus.hasCommitted}
                            onSuccess={() => {
                                voterStatus.refetch();
                                refetch();
                            }}
                        />
                    </TabsContent>
                )}

                {showReveal && (
                    <TabsContent value="reveal" className="mt-4">
                        <RevealForm
                            adminKey={adminKey}
                            hasCommitted={voterStatus.hasCommitted}
                            hasRevealed={voterStatus.hasRevealed}
                            hasLocalSecret={voterStatus.hasLocalSecret}
                            onSuccess={() => {
                                voterStatus.refetch();
                                refetch();
                            }}
                        />
                    </TabsContent>
                )}

                {showResults && (
                    <TabsContent value="results" className="mt-4">
                        <ResultsTable election={election} candidates={candidates} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
