"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell, CheckCircle2, Clock, User } from "lucide-react";
import { PublicKey } from "@solana/web3.js";

interface Proposal {
    publicKey: PublicKey;
    account: {
        proposalType: any;
        proposer: PublicKey;
        approvalCount: number;
        executed: boolean;
        consumed: boolean;
        approvers: PublicKey[];
        timestamp: number;
    };
}

interface AdminActivityFeedProps {
    proposals: Proposal[];
    currentAdmin: PublicKey | null;
    onApprove: (proposalPubkey: PublicKey) => void;
    onNavigate: (proposalPubkey: PublicKey) => void;
    isLoading?: boolean;
}

export function AdminActivityFeed({
    proposals,
    currentAdmin,
    onApprove,
    onNavigate,
    isLoading
}: AdminActivityFeedProps) {
    const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!proposals || !currentAdmin) return;

        // Filter for proposals that are not executed and current admin hasn't approved
        const pending = proposals.filter(p => {
            if (p.account.executed || p.account.consumed) return false;

            const hasApproved = p.account.approvers.some(
                approver => approver.toString() === currentAdmin.toString()
            );

            return !hasApproved;
        });

        // Sort by most recent first
        const sorted = pending.sort((a, b) =>
            b.account.timestamp - a.account.timestamp
        );

        setPendingProposals(sorted);
        setUnreadCount(sorted.length);
    }, [proposals, currentAdmin]);

    const getProposalTypeLabel = (proposalType: any): string => {
        if (proposalType.initializeElection) return "Initialize Election";
        if (proposalType.startCommit) return "Start Commit Phase";
        if (proposalType.startReveal) return "Start Reveal Phase";
        if (proposalType.endElection) return "End Election";
        if (proposalType.addAdmin) return "Add Admin";
        if (proposalType.removeAdmin) return "Remove Admin";
        if (proposalType.changeThreshold) return "Change Threshold";
        return "Unknown";
    };

    const getProposalTypeColor = (proposalType: any): string => {
        if (proposalType.initializeElection) return "bg-blue-500/10 text-blue-500";
        if (proposalType.startCommit) return "bg-green-500/10 text-green-500";
        if (proposalType.startReveal) return "bg-yellow-500/10 text-yellow-500";
        if (proposalType.endElection) return "bg-purple-500/10 text-purple-500";
        if (proposalType.addAdmin) return "bg-cyan-500/10 text-cyan-500";
        if (proposalType.removeAdmin) return "bg-red-500/10 text-red-500";
        if (proposalType.changeThreshold) return "bg-orange-500/10 text-orange-500";
        return "bg-gray-500/10 text-gray-500";
    };

    const formatAddress = (address: PublicKey): string => {
        const str = address.toString();
        return `${str.slice(0, 4)}...${str.slice(-4)}`;
    };

    const formatTimeAgo = (timestamp: number): string => {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - timestamp;

        if (diff < 60) return "just now";
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Activity Feed
                    </CardTitle>
                    <CardDescription>Loading recent proposals...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Activity Feed
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                            {unreadCount} pending
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    Proposals waiting for your approval
                </CardDescription>
            </CardHeader>
            <CardContent>
                {pendingProposals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No pending proposals</p>
                        <p className="text-sm mt-1">You&apos;re all caught up!</p>
                    </div>
                ) : (
                    <div className="h-[400px] overflow-y-auto pr-4">
                        <div className="space-y-4">
                            {pendingProposals.map((proposal, index) => (
                                <div key={proposal.publicKey.toString()}>
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                        className={getProposalTypeColor(proposal.account.proposalType)}
                                                        variant="secondary"
                                                    >
                                                        {getProposalTypeLabel(proposal.account.proposalType)}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatTimeAgo(proposal.account.timestamp)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">Proposed by:</span>
                                                    <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                                        {formatAddress(proposal.account.proposer)}
                                                    </code>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {proposal.account.approvalCount} approval(s) so far
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => onApprove(proposal.publicKey)}
                                                    className="gap-1"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onNavigate(proposal.publicKey)}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {index < pendingProposals.length - 1 && (
                                        <Separator className="mt-4" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
