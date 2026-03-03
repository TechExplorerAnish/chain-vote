"use client";

import { useParams } from "next/navigation";
import { useElectionAccount } from "@/hooks/use-election-account";
import { useVoterStatus } from "@/hooks/use-voter-status";
import { useElectionEvents } from "@/hooks/use-event-subscription";
import ElectionOverview from "@/components/election-overview";
import PhaseTiming from "@/components/phase-timing";
import CandidateList from "@/components/candidate-list";
import CommitForm from "@/components/commit-form";
import RevealForm from "@/components/reveal-form";
import ResultsTable from "@/components/results-table";
import VoterStatusBanner from "@/components/voter-status-banner";
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
            <div className="mx-auto max-w-4xl space-y-6 p-6 min-h-screen">
                <div className="pt-8"></div>
                <Alert variant="destructive" className="border-destructive/50 flex">
                    <AlertDescription className="space-y-4">
                        <div className="flex items-start gap-2">
                            <div className="text-2xl">⚠️</div>
                            <div>
                                <strong className="text-lg">Election Not Found</strong>
                            </div>
                        </div>
                        <div className="border-t border-destructive/30 pt-4">
                            <p>
                                {error || (
                                    <>
                                        The election with ID{" "}
                                        <code className="bg-red-100 dark:bg-red-900 px-2 py-1 rounded text-sm font-mono break-all">
                                            {adminKey}
                                        </code>{" "}
                                        does not exist.
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="border-t border-destructive/30 pt-4">
                            <strong className="block mb-2">Possible causes:</strong>
                            <ul className="list-disc ml-5 space-y-1 text-sm">
                                <li>The election ID might be incorrect or malformed</li>
                                <li>The election may not have been initialized yet</li>
                                <li>The election might be on a different network (Devnet vs Mainnet)</li>
                                <li>The election PDA might not have been created</li>
                            </ul>
                        </div>
                        <div className="border-t border-destructive/30 pt-4">
                            <p className="text-sm opacity-90">
                                <strong>💡 Need help?</strong> Go back to{" "}
                                <a href="/" className="underline hover:opacity-75">
                                    search for an election
                                </a>{" "}
                                or visit the{" "}
                                <a href="/about" className="underline hover:opacity-75">
                                    documentation
                                </a>.
                            </p>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const isVoting = election.phase === ElectionPhase.VotingPhase;
    const isReveal = election.phase === ElectionPhase.RevealPhase;
    const showResults = isReveal || election.phase === ElectionPhase.Finalized;

    // Determine default tab based on phase
    const defaultTab = isVoting
        ? "vote"
        : isReveal
            ? "reveal"
            : showResults
                ? "results"
                : "candidates";

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            {/* Header: election info */}
            <ElectionOverview election={election} electionPda={adminKey} />

            {/* Voter status progress */}
            <VoterStatusBanner
                phase={election.phase}
                isWhitelisted={voterStatus.isWhitelisted}
                hasCommitted={voterStatus.hasCommitted}
                hasRevealed={voterStatus.hasRevealed}
                hasLocalSecret={voterStatus.hasLocalSecret}
                loading={voterStatus.loading}
            />

            {/* All content in tabs */}
            <Tabs defaultValue={defaultTab}>
                <TabsList>
                    {isVoting && <TabsTrigger value="vote">Vote</TabsTrigger>}
                    {isReveal && <TabsTrigger value="reveal">Reveal</TabsTrigger>}
                    {showResults && <TabsTrigger value="results">Results</TabsTrigger>}
                    <TabsTrigger value="candidates">Candidates</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                {isVoting && (
                    <TabsContent value="vote" className="mt-4">
                        <CommitForm
                            adminKey={adminKey}
                            candidates={candidates}
                            isWhitelisted={voterStatus.isWhitelisted}
                            hasCommitted={voterStatus.hasCommitted}
                            startTime={election.startTime}
                            endTime={election.endTime}
                            onSuccess={() => {
                                voterStatus.refetch();
                                refetch();
                            }}
                        />
                    </TabsContent>
                )}

                {isReveal && (
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

                <TabsContent value="timeline" className="mt-4">
                    <PhaseTiming election={election} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
