"use client";

import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRevealVote } from "@/hooks/use-reveal-vote";

interface Props {
    adminKey: string;
    hasCommitted: boolean;
    hasRevealed: boolean;
    hasLocalSecret: boolean;
    onSuccess: () => void;
}

export default function RevealForm({
    adminKey,
    hasCommitted,
    hasRevealed,
    hasLocalSecret,
    onSuccess,
}: Props) {
    const { connected } = useWallet();
    const { revealVote, loading } = useRevealVote();

    const handleReveal = useCallback(async () => {
        try {
            const tx = await revealVote(new PublicKey(adminKey));
            toast.success("Vote revealed!", {
                description: `Your vote is now visible on-chain. Tx: ${tx.slice(0, 16)}…`,
            });
            onSuccess();
        } catch (err) {
            toast.error("Reveal failed", {
                description: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }, [adminKey, revealVote, onSuccess]);

    if (!connected) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-sm text-muted-foreground">
                        Connect your wallet to reveal your vote.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!hasCommitted) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-center text-sm text-muted-foreground">
                        You did not commit a vote in this election.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (hasRevealed) {
        return (
            <Card>
                <CardContent className="space-y-3 py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                        <span className="text-xl">✓</span>
                    </div>
                    <p className="font-medium">Vote Revealed</p>
                    <p className="text-sm text-muted-foreground">
                        Thank you for participating! Your vote has been counted.
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!hasLocalSecret) {
        return (
            <Card className="border-destructive/50">
                <CardContent className="space-y-3 py-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <span className="text-xl">✕</span>
                    </div>
                    <p className="font-medium text-destructive">Secret Not Found</p>
                    <p className="text-sm text-muted-foreground">
                        Your commitment secret is missing from local storage.
                        You may have cleared your browser data.
                        <br />
                        <strong className="text-destructive">Without the secret, your vote cannot be revealed.</strong>
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reveal Your Vote</CardTitle>
                <CardDescription>
                    Submit your commitment secret to decrypt and count your vote on-chain.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Commitment secret</span>
                        <Badge variant="outline" className="text-xs">Stored locally</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Your secret was saved when you committed. It will be sent to the program
                        to prove your vote is authentic.
                    </p>
                </div>

                <Alert>
                    <AlertDescription className="text-xs">
                        Once revealed, your vote becomes visible on-chain and is final.
                        This action cannot be undone.
                    </AlertDescription>
                </Alert>

                <Button
                    onClick={handleReveal}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                >
                    {loading ? "Revealing…" : "Reveal My Vote"}
                </Button>
            </CardContent>
        </Card>
    );
}
