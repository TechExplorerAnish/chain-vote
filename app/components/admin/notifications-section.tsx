"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApproveProposal } from "@/hooks/use-admin";
import { getReadOnlyProgram, getProgram, getProvider } from "@/lib/program";
import { parseError } from "@/lib/utils";
import { ExpiryCountdown } from "./proposal-status-card";
import { Bell, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { getMultisigPda, getProposalPda, getElectionPda } from "@/lib/pda";
import { GovernanceAction, ElectionPhase, PHASE_LABELS } from "@/lib/types";

export interface PendingApprovalItem {
    multisigAuthority: string;
    multisigPda: PublicKey;
    threshold: number;
    adminCount: number;
    proposalPda: PublicKey;
    nonce: bigint;
    proposer: PublicKey;
    actionLabel: string;
    actionType?: GovernanceAction;
    targetPhase?: ElectionPhase;
    approvalCount: number;
    createdAt: bigint;
    expiresAt: bigint;
}

interface NotificationsSectionProps {
    prefetchedItems: PendingApprovalItem[];
    prefetchLoading: boolean;
    onRefresh: () => Promise<void>;
}

export function NotificationsSection({ prefetchedItems, prefetchLoading, onRefresh }: NotificationsSectionProps) {
    const { approveProposal, loading: approveLoading } = useApproveProposal();
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Listen for on-chain approval events and refresh when detected
    useEffect(() => {
        const program = getReadOnlyProgram();
        const listenerHandles: number[] = [];
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        const refreshWithRetry = async () => {
            await onRefresh();
            setLastUpdate(new Date());

            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(async () => {
                await onRefresh();
                setLastUpdate(new Date());
            }, 1200);
        };

        const setupEventListener = async () => {
            try {
                listenerHandles.push(
                    program.addEventListener("GovernanceProposalCreated", () => {
                        refreshWithRetry();
                    })
                );
                listenerHandles.push(
                    program.addEventListener("GovernanceProposalApproved", () => {
                        refreshWithRetry();
                    })
                );
                listenerHandles.push(
                    program.addEventListener("GovernanceProposalExecuted", () => {
                        refreshWithRetry();
                    })
                );
            } catch (err) {
                console.error("Failed to setup event listener:", err);
            }
        };

        setupEventListener();

        return () => {
            if (retryTimer) clearTimeout(retryTimer);
            for (const handle of listenerHandles) {
                program.removeEventListener(handle);
            }
        };
    }, [onRefresh]);

    const handleApprove = useCallback(async (item: PendingApprovalItem) => {
        try {
            const tx = await approveProposal(item.multisigPda, item.proposalPda);

            // Build approval message with phase info if available
            let description = `Tx: ${tx.slice(0, 16)}…`;
            if (item.actionType === GovernanceAction.TransitionPhase && item.targetPhase !== undefined) {
                const phaseName = PHASE_LABELS[item.targetPhase];
                description = `Transitioning to: ${phaseName}. Tx: ${tx.slice(0, 16)}…`;
            }

            toast.success("Proposal approved!", { description });
            // Optimistic refresh now; event listeners + retry will keep it consistent.
            await onRefresh();
            setLastUpdate(new Date());
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [approveProposal, onRefresh]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <CardTitle>Proposal Notifications</CardTitle>
                </div>
                <CardDescription>
                    Pending proposals requiring your approval across registered multisigs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                            {prefetchedItems.length} Pending
                        </Badge>
                        <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                            🔗 Event-Driven
                        </Badge>
                        {lastUpdate && (
                            <Badge variant="secondary" className="text-xs">
                                Updated {lastUpdate.toLocaleTimeString()}
                            </Badge>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={prefetchLoading}>
                        {prefetchLoading ? "Refreshing…" : "Manual Refresh"}
                    </Button>
                </div>

                {prefetchedItems.length === 0 ? (
                    <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            {prefetchLoading ? "Loading proposals..." : "No pending proposals for your wallet."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {prefetchedItems.map((item) => (
                            <div key={item.proposalPda.toBase58()} className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-3 transition-colors hover:bg-amber-100/50 dark:hover:bg-amber-900/30">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className="bg-purple-600 hover:bg-purple-700 text-xs font-semibold">
                                            #{item.nonce.toString()}
                                        </Badge>
                                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                            {item.actionLabel}
                                        </span>
                                        {item.actionType === GovernanceAction.TransitionPhase && item.targetPhase !== undefined && (
                                            <Badge variant="default" className="bg-cyan-600 hover:bg-cyan-700 text-xs">
                                                → {PHASE_LABELS[item.targetPhase]}
                                            </Badge>
                                        )}
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                        {item.approvalCount}/{item.threshold} ✓
                                    </Badge>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    <div className="font-mono break-all text-xs opacity-70">Authority: {item.multisigAuthority}</div>
                                    <div className="font-mono break-all text-xs opacity-70">Proposer: {item.proposer.toBase58()}</div>
                                    <div className="flex items-center gap-2 justify-between">
                                        <span>{new Date(Number(item.createdAt) * 1000).toLocaleString()}</span>
                                        <Badge variant="outline" className="text-xs">
                                            Expires: <ExpiryCountdown expiresAt={item.expiresAt} />
                                        </Badge>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <Button size="sm" onClick={() => handleApprove(item)} disabled={approveLoading}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        {approveLoading ? "Approving…" : "Approve"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
