"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApproveProposal } from "@/hooks/use-admin";
import { getReadOnlyProgram } from "@/lib/program";
import { parseError } from "@/lib/utils";
import { ExpiryCountdown } from "./proposal-status-card";

export interface PendingApprovalItem {
    multisigAuthority: string;
    multisigPda: PublicKey;
    threshold: number;
    adminCount: number;
    proposalPda: PublicKey;
    nonce: bigint;
    proposer: PublicKey;
    actionLabel: string;
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
                    await program.addEventListener("GovernanceProposalCreated", () => {
                        refreshWithRetry();
                    })
                );
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalApproved", () => {
                        refreshWithRetry();
                    })
                );
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalExecuted", () => {
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
            toast.success("Proposal approved!", { description: `Tx: ${tx.slice(0, 16)}…` });
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
                <CardTitle>Proposal Notifications</CardTitle>
                <CardDescription>
                    Pending proposals requiring your approval across registered multisigs.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{prefetchedItems.length} pending</Badge>
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            🔗 Event-driven sync
                        </Badge>
                        {lastUpdate && (
                            <span className="text-xs text-muted-foreground">
                                Updated {lastUpdate.toLocaleTimeString()}
                            </span>
                        )}
                    </div>
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={prefetchLoading}>
                        {prefetchLoading ? "Refreshing…" : "Manual Refresh"}
                    </Button>
                </div>

                {prefetchedItems.length === 0 ? (
                    <div className="rounded-md border p-4 text-sm text-muted-foreground">
                        {prefetchLoading ? "Loading proposals..." : "No pending proposals for your wallet."}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {prefetchedItems.map((item) => (
                            <div key={item.proposalPda.toBase58()} className="rounded-md border p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-sm font-medium">Proposal #{item.nonce.toString()} • {item.actionLabel}</div>
                                    <Badge variant="outline">
                                        {item.approvalCount}/{item.threshold} approvals
                                    </Badge>
                                </div>
                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    <div className="font-mono break-all">Authority: {item.multisigAuthority}</div>
                                    <div className="font-mono break-all">Proposer: {item.proposer.toBase58()}</div>
                                    <div>{new Date(Number(item.createdAt) * 1000).toLocaleString()} • threshold {item.threshold}/{item.adminCount}</div>
                                    <div className="flex items-center gap-1">
                                        <span>Expires:</span>
                                        <ExpiryCountdown expiresAt={item.expiresAt} />
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <Button size="sm" onClick={() => handleApprove(item)} disabled={approveLoading}>
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
