"use client";

import { useState, useCallback, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useCommitVote } from "@/hooks/use-commit-vote";
import Countdown from "@/components/countdown";
import type { CandidateAccount } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
    adminKey: string;
    candidates: CandidateAccount[];
    isWhitelisted: boolean;
    hasCommitted: boolean;
    startTime: bigint;
    endTime: bigint;
    onSuccess: () => void;
}

export default function CommitForm({
    adminKey,
    candidates,
    isWhitelisted,
    hasCommitted,
    startTime,
    endTime,
    onSuccess,
}: Props) {
    const { connected } = useWallet();
    const { commitVote, loading } = useCommitVote();
    const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
    const [confirming, setConfirming] = useState(false);

    const selectedInfo = selectedCandidate !== null
        ? candidates.find((c) => c.index === selectedCandidate)
        : null;

    const handleCommit = useCallback(async () => {
        if (selectedCandidate === null) return;

        try {
            const tx = await commitVote(new PublicKey(adminKey), selectedCandidate);
            toast.success("Vote committed!", {
                description: `Your encrypted ballot is now on-chain. Tx: ${tx.slice(0, 16)}…`,
            });
            setConfirming(false);
            onSuccess();
        } catch (err) {
            toast.error("Commit failed", {
                description: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }, [selectedCandidate, adminKey, commitVote, onSuccess]);

    if (!connected) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-sm text-muted-foreground">
                        Connect your wallet to cast your vote.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!isWhitelisted) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-sm text-muted-foreground">
                        Your wallet is not registered for this election. Contact the election admin.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (hasCommitted) {
        return (
            <Card>
                <CardContent className="space-y-3 py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-xl">✓</span>
                    </div>
                    <p className="font-medium">Vote Committed</p>
                    <p className="text-sm text-muted-foreground">
                        Your encrypted vote is on-chain. You&apos;ll reveal it during the Reveal phase.
                        <br />
                        <span className="text-xs">
                            Do not clear your browser data — your commitment secret is stored locally.
                        </span>
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Time-based guards: the program enforces start_time / end_time
    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = Number(startTime);
    const endSec = Number(endTime);

    if (nowSec < startSec) {
        return (
            <Card>
                <CardContent className="space-y-3 py-8 text-center">
                    <p className="font-medium">Voting hasn&apos;t started yet</p>
                    <p className="text-sm text-muted-foreground">
                        The election is in the Voting phase, but the voting window opens at{" "}
                        <span className="font-mono text-xs">
                            {new Date(startSec * 1000).toLocaleString()}
                        </span>
                    </p>
                    <Countdown targetTime={startTime} label="Opens in" />
                </CardContent>
            </Card>
        );
    }

    if (nowSec > endSec) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-sm text-muted-foreground">
                        The voting window has closed.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Confirmation step
    if (confirming && selectedInfo) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Confirm Your Vote</CardTitle>
                    <CardDescription>
                        Please review your selection. Once committed, it cannot be changed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border-2 border-primary p-4 text-center">
                        <p className="text-lg font-semibold">{selectedInfo.name}</p>
                        <Badge variant="secondary" className="mt-1">{selectedInfo.party}</Badge>
                    </div>

                    <Alert>
                        <AlertDescription className="text-xs">
                            Your vote will be encrypted with a random nonce and salt.
                            The secret is saved in your browser so you can reveal it later.
                            <strong> Never clear your browser data before revealing.</strong>
                        </AlertDescription>
                    </Alert>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setConfirming(false)}
                            disabled={loading}
                        >
                            Go Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleCommit}
                            disabled={loading}
                        >
                            {loading ? "Committing…" : "Confirm & Commit"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cast Your Vote</CardTitle>
                <CardDescription>
                    Select the candidate you want to vote for. Your choice is encrypted until the Reveal phase.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {candidates.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                        No candidates registered yet.
                    </p>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {candidates.map((c) => (
                            <button
                                key={c.index}
                                type="button"
                                onClick={() => setSelectedCandidate(c.index)}
                                className={cn(
                                    "flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-colors",
                                    selectedCandidate === c.index
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50 hover:bg-accent"
                                )}
                            >
                                <div className="flex w-full items-center justify-between">
                                    <span className="font-semibold">{c.name}</span>
                                    <div
                                        className={cn(
                                            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
                                            selectedCandidate === c.index
                                                ? "border-primary bg-primary"
                                                : "border-muted-foreground/30"
                                        )}
                                    >
                                        {selectedCandidate === c.index && (
                                            <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                                        )}
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">{c.party}</Badge>
                            </button>
                        ))}
                    </div>
                )}

                <Separator />

                <Button
                    onClick={() => setConfirming(true)}
                    disabled={selectedCandidate === null}
                    className="w-full"
                >
                    {selectedCandidate === null ? "Select a candidate" : `Vote for ${selectedInfo?.name}`}
                </Button>
            </CardContent>
        </Card>
    );
}
