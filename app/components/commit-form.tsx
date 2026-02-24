"use client";

import { useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCommitVote } from "@/hooks/use-commit-vote";
import type { CandidateAccount } from "@/lib/types";

interface Props {
    adminKey: string;
    candidates: CandidateAccount[];
    isWhitelisted: boolean;
    hasCommitted: boolean;
    onSuccess: () => void;
}

export default function CommitForm({
    adminKey,
    candidates,
    isWhitelisted,
    hasCommitted,
    onSuccess,
}: Props) {
    const { connected } = useWallet();
    const { commitVote, loading } = useCommitVote();
    const [selectedCandidate, setSelectedCandidate] = useState<string>("");

    const handleCommit = useCallback(async () => {
        if (!selectedCandidate) return;

        try {
            const idx = parseInt(selectedCandidate, 10);
            const tx = await commitVote(new PublicKey(adminKey), idx);
            toast.success("Vote committed!", {
                description: `Tx: ${tx.slice(0, 16)}…`,
                action: {
                    label: "View",
                    onClick: () =>
                        window.open(
                            `https://explorer.solana.com/tx/${tx}?cluster=devnet`,
                            "_blank"
                        ),
                },
            });
            onSuccess();
        } catch (err) {
            toast.error("Commit failed", {
                description: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }, [selectedCandidate, adminKey, commitVote, onSuccess]);

    if (!connected) {
        return (
            <Alert>
                <AlertDescription>Connect your wallet to vote.</AlertDescription>
            </Alert>
        );
    }

    if (!isWhitelisted) {
        return (
            <Alert>
                <AlertDescription>
                    Your wallet is not whitelisted for this election.
                </AlertDescription>
            </Alert>
        );
    }

    if (hasCommitted) {
        return (
            <Alert>
                <AlertDescription>
                    You have already committed your vote. Wait for the reveal phase.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cast Your Vote</CardTitle>
                <CardDescription>
                    Select a candidate and commit your encrypted vote. Your choice is hidden until the reveal phase.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Select
                    value={selectedCandidate}
                    onValueChange={setSelectedCandidate}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a candidate" />
                    </SelectTrigger>
                    <SelectContent>
                        {candidates.map((c) => (
                            <SelectItem key={c.index} value={c.index.toString()}>
                                {c.name} — {c.party}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    onClick={handleCommit}
                    disabled={loading || !selectedCandidate}
                    className="w-full"
                >
                    {loading ? "Committing…" : "Commit Vote"}
                </Button>
            </CardContent>
        </Card>
    );
}
