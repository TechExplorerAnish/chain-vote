"use client";

import { useCallback, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAddCandidate } from "@/hooks/use-admin";
import { useElectionAccount } from "@/hooks/use-election-account";
import { ElectionPhase, PHASE_LABELS } from "@/lib/types";
import { parseError } from "@/lib/utils";

export function CandidateSection({ adminKey }: { adminKey: string }) {
    const { addCandidate, loading } = useAddCandidate();
    const { election, refetch } = useElectionAccount(adminKey);
    const { publicKey, connected } = useWallet();

    const [name, setName] = useState("");
    const [party, setParty] = useState("");
    const isElectionAdmin = Boolean(
        election &&
        publicKey &&
        election.admin.toBase58() === publicKey.toBase58()
    );

    const handleAdd = useCallback(async () => {
        if (!publicKey || !connected) {
            toast.error("Wallet Not Connected", {
                description: "Please connect your wallet first.",
            });
            return;
        }
        if (!election) {
            toast.error("Election Not Found", {
                description: "Please verify the admin key.",
            });
            return;
        }
        try {
            const index = election.candidateCount;
            const tx = await addCandidate(new PublicKey(adminKey), name, party, index);
            toast.success(`Candidate #${index} added!`, { description: `Tx: ${tx.slice(0, 16)}…` });
            setName("");
            setParty("");
            refetch();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, connected, election, adminKey, name, party, addCandidate, refetch]);

    const canAdd =
        election?.phase === ElectionPhase.RegistrationPhase && connected && isElectionAdmin;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Add Candidate</CardTitle>
                <CardDescription>
                    Only during Registration phase, before start time.
                    {election && (
                        <span className="ml-2">
                            Current count: <strong>{election.candidateCount}</strong>
                        </span>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!connected && (
                    <Alert>
                        <AlertDescription>
                            Please connect your wallet to add candidates.
                        </AlertDescription>
                    </Alert>
                )}
                {connected && election && election.phase !== ElectionPhase.RegistrationPhase && (
                    <Alert>
                        <AlertDescription>
                            Candidates can only be added during Registration phase. Current phase: {PHASE_LABELS[election.phase] || "Unknown"}
                        </AlertDescription>
                    </Alert>
                )}
                {connected && election && !isElectionAdmin && (
                    <Alert>
                        <AlertDescription>
                            Only the election admin ({election.admin.toBase58()}) can add candidates in the current on-chain design.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Candidate name"
                            disabled={!canAdd || loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Party</Label>
                        <Input
                            value={party}
                            onChange={(e) => setParty(e.target.value)}
                            placeholder="Party name"
                            disabled={!canAdd || loading}
                        />
                    </div>
                </div>
                <Button onClick={handleAdd} disabled={loading || !canAdd || !connected}>
                    {loading ? "Adding…" : "Add Candidate"}
                </Button>
            </CardContent>
        </Card>
    );
}
