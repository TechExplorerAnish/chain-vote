"use client";

import { useState, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ProposalAccountData } from "@/hooks/use-admin";
import { GovernanceAction } from "@/lib/types";

const ACTION_LABELS: Record<GovernanceAction, string> = {
    [GovernanceAction.InitializeElection]: "Initialize Election",
    [GovernanceAction.TransitionPhase]: "Transition Phase",
    [GovernanceAction.PublishTallyRoot]: "Publish Tally Root",
};

export function ProposalStatusCard({
    proposal,
    proposalPda,
    loading,
    error,
    multisig,
}: {
    proposal: ProposalAccountData | null;
    proposalPda: PublicKey | null;
    loading: boolean;
    error: string | null;
    multisig?: { threshold: number; adminCount: number } | null;
}) {
    if (loading) {
        return (
            <Card>
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">Loading proposal…</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (!proposal) return null;

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isExpired = proposal.expiresAt > 0n && now > proposal.expiresAt;
    const approvedCount = proposal.approvals.filter(Boolean).length;

    return (
        <Card>
            <CardContent className="pt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between text-base font-semibold">
                    <span>Proposal #{proposal.nonce.toString()}</span>
                    <div className="flex gap-2">
                        {proposal.executed && (
                            <Badge variant="default">Executed</Badge>
                        )}
                        {proposal.consumed && (
                            <Badge variant="secondary">Consumed</Badge>
                        )}
                        {!proposal.executed && !isExpired && (
                            <Badge variant="outline">Pending</Badge>
                        )}
                        {isExpired && !proposal.executed && (
                            <Badge variant="destructive">Expired</Badge>
                        )}
                    </div>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Action</span>
                    <Badge variant="outline">{ACTION_LABELS[proposal.action]}</Badge>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Proposer</span>
                    <span className="font-mono text-xs">
                        {proposal.proposer.toBase58().slice(0, 8)}…{proposal.proposer.toBase58().slice(-4)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Approvals</span>
                    <div className="flex items-center gap-2">
                        {multisig ? (
                            <span className="font-medium">
                                {approvedCount}/{multisig.threshold}
                                <span className="ml-1 text-xs text-muted-foreground">
                                    (threshold: {multisig.threshold}/{multisig.adminCount})
                                </span>
                            </span>
                        ) : (
                            <span className="font-medium">{approvedCount}</span>
                        )}
                        <div className="flex gap-1">
                            {proposal.approvals.map((approved, i) => (
                                <div
                                    key={i}
                                    className={`h-2 w-2 rounded-full ${approved
                                        ? "bg-primary"
                                        : "bg-muted"
                                        }`}
                                    title={`Admin ${i}: ${approved ? "Approved" : "Pending"}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(Number(proposal.createdAt) * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className={isExpired ? "text-destructive" : ""}>
                        {new Date(Number(proposal.expiresAt) * 1000).toLocaleString()}
                    </span>
                </div>
                {proposalPda && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">PDA</span>
                        <span className="font-mono text-xs">
                            {proposalPda.toBase58().slice(0, 12)}…{proposalPda.toBase58().slice(-4)}
                        </span>
                    </div>
                )}
                {proposal.executed && proposal.consumed && (
                    <Alert>
                        <AlertDescription>
                            This proposal has been executed and consumed. It cannot be used again.
                        </AlertDescription>
                    </Alert>
                )}
                {proposal.executed && !proposal.consumed && (
                    <Alert>
                        <AlertDescription>
                            This proposal is executed and ready to be consumed by its target instruction.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

export function ExpiryCountdown({ expiresAt }: { expiresAt: bigint }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        const updateCountdown = () => {
            const now = Math.floor(Date.now() / 1000);
            const expiry = Number(expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft("Expired");
                return;
            }

            const days = Math.floor(diff / 86400);
            const hours = Math.floor((diff % 86400) / 3600);
            const minutes = Math.floor((diff % 3600) / 60);
            const seconds = diff % 60;

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h ${minutes}m`);
            } else if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${seconds}s`);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    const now = Math.floor(Date.now() / 1000);
    const expiry = Number(expiresAt);
    const isExpired = expiry <= now;
    const isUrgent = expiry - now < 3600;

    return (
        <span className={isExpired ? "text-destructive font-medium" : isUrgent ? "text-orange-600 dark:text-orange-400 font-medium" : "text-muted-foreground"}>
            ⏱️ {timeLeft}
        </span>
    );
}
