"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ElectionPhase, PHASE_LABELS } from "@/lib/types";

interface Props {
    phase: ElectionPhase;
    isWhitelisted: boolean;
    hasCommitted: boolean;
    hasRevealed: boolean;
    hasLocalSecret: boolean;
    loading: boolean;
}

const STEPS = [
    { key: "whitelisted", label: "Registered" },
    { key: "committed", label: "Vote Committed" },
    { key: "revealed", label: "Vote Revealed" },
] as const;

export default function VoterStatusBanner({
    phase,
    isWhitelisted,
    hasCommitted,
    hasRevealed,
    hasLocalSecret,
    loading,
}: Props) {
    const { connected, publicKey } = useWallet();

    if (!connected || !publicKey) {
        return (
            <Card>
                <CardContent className="py-4">
                    <p className="text-center text-sm text-muted-foreground">
                        Connect your wallet to see your voter status and participate in this election.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-4">
                    <p className="text-center text-sm text-muted-foreground">
                        Checking voter status…
                    </p>
                </CardContent>
            </Card>
        );
    }

    const stepsDone = [isWhitelisted, hasCommitted, hasRevealed];

    // What should the voter do next?
    const getNextAction = (): string | null => {
        if (!isWhitelisted) return "You are not registered for this election. Contact the admin.";
        if (!hasCommitted && phase === ElectionPhase.VotingPhase) return "Select a candidate below and cast your vote.";
        if (!hasCommitted && phase !== ElectionPhase.VotingPhase) return "Voting has not started yet. You'll be able to vote during the Voting phase.";
        if (hasCommitted && !hasRevealed && phase === ElectionPhase.VotingPhase) return "Your vote is committed. Wait for the Reveal phase to reveal it.";
        if (hasCommitted && !hasRevealed && phase === ElectionPhase.RevealPhase) {
            if (!hasLocalSecret) return "⚠ Your commitment secret is missing from this browser. Your vote cannot be revealed.";
            return "Reveal your vote below to finalize your ballot.";
        }
        if (hasRevealed) return "Your vote has been revealed. Thank you for participating!";
        return null;
    };

    const nextAction = getNextAction();

    return (
        <Card>
            <CardContent className="space-y-4 py-4">
                {/* Voter address */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Your Status</span>
                        <Badge variant="outline" className="font-mono text-xs">
                            {publicKey.toBase58().slice(0, 6)}…{publicKey.toBase58().slice(-4)}
                        </Badge>
                    </div>
                    <Badge variant="secondary">{PHASE_LABELS[phase]}</Badge>
                </div>

                <Separator />

                {/* Step progress */}
                <div className="flex items-center justify-between gap-2">
                    {STEPS.map((step, i) => {
                        const done = stepsDone[i];
                        const isActive =
                            (step.key === "whitelisted" && !isWhitelisted) ||
                            (step.key === "committed" && isWhitelisted && !hasCommitted) ||
                            (step.key === "revealed" && hasCommitted && !hasRevealed);

                        return (
                            <div key={step.key} className="flex flex-1 items-center gap-2">
                                {i > 0 && (
                                    <div
                                        className={`h-px flex-1 ${stepsDone[i - 1] ? "bg-primary" : "bg-border"
                                            }`}
                                    />
                                )}
                                <div className="flex flex-col items-center gap-1">
                                    <div
                                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${done
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : isActive
                                                    ? "border-primary text-primary"
                                                    : "border-muted text-muted-foreground"
                                            }`}
                                    >
                                        {done ? "✓" : i + 1}
                                    </div>
                                    <span
                                        className={`text-xs ${done
                                                ? "font-medium"
                                                : isActive
                                                    ? "font-medium text-primary"
                                                    : "text-muted-foreground"
                                            }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Next action hint */}
                {nextAction && (
                    <>
                        <Separator />
                        <p className="text-center text-sm text-muted-foreground">{nextAction}</p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
