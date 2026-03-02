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
import { VoterConfirmationDialog } from "@/components/voter-confirmation-dialog";
import VoterManagementDashboard from "@/components/voter-management-dashboard";
import { useRegisterVoter } from "@/hooks/use-admin";
import { useElectionAccount } from "@/hooks/use-election-account";
import { ElectionPhase, PHASE_LABELS } from "@/lib/types";
import { getElectionPda } from "@/lib/pda";
import { parseError } from "@/lib/utils";

function VoterSection({ adminKey, onVoterRegistered }: { adminKey: string; onVoterRegistered?: () => void }) {
    const { registerVoter, loading } = useRegisterVoter();
    const { election } = useElectionAccount(adminKey);
    const { publicKey, connected } = useWallet();
    const isElectionAdmin = Boolean(
        election &&
        publicKey &&
        election.admin.toBase58() === publicKey.toBase58()
    );

    const [voterKey, setVoterKey] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [voterAuditLog, setVoterAuditLog] = useState<Array<{ address: string; action: string; timestamp: number; admin: string }>>();

    const handleRegisterClick = useCallback(() => {
        if (!publicKey || !connected) {
            toast.error("Wallet Not Connected", {
                description: "Please connect your wallet first.",
            });
            return;
        }
        if (!voterKey.trim()) {
            toast.error("Empty Voter Address", {
                description: "Please enter a valid voter public key.",
            });
            return;
        }
        setShowConfirmation(true);
    }, [publicKey, connected, voterKey]);

    const handleConfirmRegister = useCallback(async () => {
        if (!publicKey || !connected) return;
        try {
            const tx = await registerVoter(
                new PublicKey(adminKey),
                new PublicKey(voterKey)
            );
            toast.success("Voter registered!", { description: `Tx: ${tx.slice(0, 16)}…` });

            // Log to audit trail
            const auditEntry = {
                address: voterKey,
                action: "registered",
                timestamp: Math.floor(Date.now() / 1000),
                admin: publicKey.toBase58(),
            };
            setVoterAuditLog(prev => [...(prev || []), auditEntry]);
            localStorage.setItem(`audit_log_${adminKey}`, JSON.stringify([...(voterAuditLog || []), auditEntry]));

            setVoterKey("");
            setShowConfirmation(false);
            if (onVoterRegistered) {
                onVoterRegistered();
            }
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, connected, adminKey, voterKey, registerVoter, onVoterRegistered, voterAuditLog]);

    const canRegister =
        election?.phase === ElectionPhase.RegistrationPhase && connected && isElectionAdmin;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Register Voter</CardTitle>
                <CardDescription>
                    Whitelist a voter wallet. Only during Registration phase.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!connected && (
                    <Alert>
                        <AlertDescription>
                            Please connect your wallet to register voters.
                        </AlertDescription>
                    </Alert>
                )}
                {!election && (
                    <Alert>
                        <AlertDescription>
                            Election not found. Please verify the admin key.
                        </AlertDescription>
                    </Alert>
                )}
                {connected && election && !election?.phase && (
                    <Alert>
                        <AlertDescription>
                            Voters can only be registered during Registration phase.
                        </AlertDescription>
                    </Alert>
                )}
                {connected && election && election?.phase !== ElectionPhase.RegistrationPhase && (
                    <Alert>
                        <AlertDescription>
                            Voters can only be registered during Registration phase.
                            <p>

                                Current phase: {PHASE_LABELS[election.phase] || "Unknown"}
                            </p>
                        </AlertDescription>
                    </Alert>
                )}
                {connected && election && !isElectionAdmin && (
                    <Alert>
                        <AlertDescription>
                            Only the election admin ({election.admin.toBase58()}) can register voters in the current on-chain design.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                    <Label>Voter Public Key</Label>
                    <Input
                        value={voterKey}
                        onChange={(e) => setVoterKey(e.target.value)}
                        placeholder="Voter wallet address"
                        className="font-mono text-xs"
                        disabled={!canRegister || loading}
                    />
                </div>
                <Button onClick={handleRegisterClick} disabled={loading || !canRegister || !connected}>
                    {loading ? "Registering…" : "Register Voter"}
                </Button>

                <VoterConfirmationDialog
                    open={showConfirmation}
                    voterAddress={voterKey}
                    onConfirm={handleConfirmRegister}
                    onCancel={() => setShowConfirmation(false)}
                    isLoading={loading}
                    type="register"
                />
            </CardContent>
        </Card>
    );
}

export function VotersSection({ adminKey }: { adminKey: string }) {
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    const handleVoterRegistered = useCallback(() => {
        setRefetchTrigger(prev => prev + 1);
    }, []);

    return (
        <div className="space-y-4">
            <VoterSection adminKey={adminKey} onVoterRegistered={handleVoterRegistered} />
            {adminKey && (
                <VoterManagementDashboard
                    electionPda={getElectionPda(new PublicKey(adminKey))[0].toBase58()}
                    refetchTrigger={refetchTrigger}
                    adminKey={adminKey}
                />
            )}
        </div>
    );
}
