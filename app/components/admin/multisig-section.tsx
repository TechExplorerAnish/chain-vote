"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInitializeMultisig, useMultisigAccount } from "@/hooks/use-admin";
import { useMultisigRegistry } from "@/hooks/use-multisig-registry";
import { getMultisigPda } from "@/lib/pda";
import { parseError } from "@/lib/utils";

export function MultisigSection() {
    const { publicKey } = useWallet();
    const { initialize, loading } = useInitializeMultisig();
    const { registerMultisig, loading: registering } = useMultisigRegistry();
    const { multisig: existingMultisig, fetchMultisig: fetchExistingMultisig } = useMultisigAccount(publicKey?.toBase58());
    const [adminsInput, setAdminsInput] = useState("");
    const [threshold, setThreshold] = useState("1");
    const MAX_ADMINS = 5;

    // Compute and display the multisig PDA that will be created
    const multisigPda = publicKey ? getMultisigPda(publicKey)[0].toBase58() : "";

    useEffect(() => {
        if (publicKey) {
            fetchExistingMultisig();
        }
    }, [publicKey, fetchExistingMultisig]);

    const handleInit = useCallback(async () => {
        if (!publicKey) return;

        if (existingMultisig) {
            toast.error("Multisig already initialized for this authority", {
                description: `Current threshold is ${existingMultisig.threshold}/${existingMultisig.adminCount}.`,
            });
            return;
        }

        const rawAdmins = adminsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        if (rawAdmins.length === 0) {
            toast.error("Provide at least one admin key");
            return;
        }

        if (rawAdmins.length > MAX_ADMINS) {
            toast.error(`Maximum ${MAX_ADMINS} admins allowed`);
            return;
        }

        let adminKeys: PublicKey[] = [];
        try {
            adminKeys = rawAdmins.map((s) => new PublicKey(s));
        } catch {
            toast.error("One or more admin public keys are invalid");
            return;
        }

        const uniqueKeys = new Set(adminKeys.map((k) => k.toBase58()));
        if (uniqueKeys.size !== adminKeys.length) {
            toast.error("Admin keys must be unique");
            return;
        }

        const thresholdValue = Number.parseInt(threshold, 10);
        if (!Number.isInteger(thresholdValue) || thresholdValue <= 0) {
            toast.error("Threshold must be a positive integer");
            return;
        }

        if (thresholdValue > adminKeys.length) {
            toast.error("Threshold cannot exceed number of admins");
            return;
        }

        if (thresholdValue > MAX_ADMINS) {
            toast.error(`Threshold cannot exceed ${MAX_ADMINS}`);
            return;
        }

        try {
            const tx = await initialize(adminKeys, thresholdValue);
            toast.success("Multisig initialized!", { description: `Tx: ${tx.slice(0, 16)}…` });

            // Auto-register multisig metadata in Pinata for discovery
            try {
                const adminStrings = adminKeys.map(k => k.toBase58());
                await registerMultisig(
                    publicKey.toBase58(),
                    multisigPda,
                    adminStrings,
                    thresholdValue
                );
                toast.success("Multisig registered! All admins can now auto-discover it.", {
                    duration: 5000,
                });
            } catch (regErr) {
                console.error("Failed to register multisig:", regErr);
                toast.warning("Multisig created but registration failed", {
                    description: "Admins will need to manually enter the authority key.",
                });
            }
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, existingMultisig, adminsInput, threshold, initialize, multisigPda, registerMultisig]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Initialize Multisig</CardTitle>
                <CardDescription>
                    Set up the admin multisig. PDA seed: [&quot;multisig&quot;, payer].
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 overflow-hidden">
                {publicKey && (
                    <Alert>
                        <AlertDescription className="space-y-1 text-xs">
                            <div>
                                <strong>Multisig Authority:</strong>
                                <div className="font-mono break-all">{publicKey.toBase58()}</div>
                            </div>
                            <div>
                                <strong>Multisig PDA:</strong>
                                <div className="font-mono break-all">{multisigPda}</div>
                            </div>
                            <span className="text-muted-foreground">
                                🤖 Metadata will be auto-registered in Pinata for all admins to discover
                            </span>
                        </AlertDescription>
                    </Alert>
                )}
                {existingMultisig && (
                    <Alert>
                        <AlertDescription className="text-xs">
                            Existing on-chain multisig detected: {existingMultisig.adminCount} admins, threshold {existingMultisig.threshold}.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="space-y-2">
                    <Label>Admin Public Keys (comma-separated)</Label>
                    <Input
                        value={adminsInput}
                        onChange={(e) => setAdminsInput(e.target.value)}
                        placeholder="Key1, Key2, Key3"
                        className="font-mono text-xs"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Threshold</Label>
                    <Input
                        type="number"
                        min={1}
                        max={5}
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                        Required approvals to execute. Set this equal to admin count if you want unanimous approval.
                    </p>
                </div>
                <Button onClick={handleInit} disabled={loading || registering}>
                    {loading ? "Initializing…" : registering ? "Registering…" : "Initialize Multisig"}
                </Button>
            </CardContent>
        </Card>
    );
}
