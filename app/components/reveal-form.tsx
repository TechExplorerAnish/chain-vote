"use client";

import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
            toast.error("Reveal failed", {
                description: err instanceof Error ? err.message : "Unknown error",
            });
        }
    }, [adminKey, revealVote, onSuccess]);

    if (!connected) {
        return (
            <Alert>
                <AlertDescription>Connect your wallet to reveal.</AlertDescription>
            </Alert>
        );
    }

    if (!hasCommitted) {
        return (
            <Alert>
                <AlertDescription>
                    You did not commit a vote in this election.
                </AlertDescription>
            </Alert>
        );
    }

    if (hasRevealed) {
        return (
            <Alert>
                <AlertDescription>
                    Your vote has already been revealed. Thank you for participating.
                </AlertDescription>
            </Alert>
        );
    }

    if (!hasLocalSecret) {
        return (
            <Alert variant="destructive">
                <AlertDescription>
                    Commitment secret not found in local storage. You may have cleared your
                    browser data. Without the salt, your vote cannot be revealed.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reveal Your Vote</CardTitle>
                <CardDescription>
                    Submit your stored commitment secret to reveal your vote on-chain.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={handleReveal}
                    disabled={loading}
                    className="w-full"
                >
                    {loading ? "Revealing…" : "Reveal Vote"}
                </Button>
            </CardContent>
        </Card>
    );
}
