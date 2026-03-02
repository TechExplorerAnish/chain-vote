"use client";
import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useInitializeMultisig, useMultisigAccount } from "@/hooks/use-admin";
import { useMultisigRegistry } from "@/hooks/use-multisig-registry";
import { getMultisigPda } from "@/lib/pda";
import { parseError } from "@/lib/utils";
import { ShieldCheck, Users, CheckCircle2, AlertCircle } from "lucide-react";

function MonoAddress({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
            </p>
            <p className="font-mono text-xs break-all leading-relaxed text-foreground">
                {value}
            </p>
        </div>
    );
}

export function MultisigSection() {
    const { publicKey } = useWallet();
    const { initialize, loading } = useInitializeMultisig();
    const { registerMultisig, loading: registering } = useMultisigRegistry();
    const { multisig: existingMultisig, fetchMultisig: fetchExistingMultisig } =
        useMultisigAccount(publicKey?.toBase58());
    const [adminsInput, setAdminsInput] = useState("");
    const [threshold, setThreshold] = useState("1");
    const MAX_ADMINS = 5;

    const multisigPda = publicKey
        ? getMultisigPda(publicKey)[0].toBase58()
        : "";

    useEffect(() => {
        if (publicKey) fetchExistingMultisig();
    }, [publicKey, fetchExistingMultisig]);

    const handleInit = useCallback(async () => {
        if (!publicKey) return;

        if (existingMultisig) {
            toast.error("Multisig already initialized", {
                description: `Current threshold: ${existingMultisig.threshold}/${existingMultisig.adminCount}.`,
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
            toast.success("Multisig initialized", {
                description: `Transaction: ${tx.slice(0, 16)}…`,
            });

            try {
                const adminStrings = adminKeys.map((k) => k.toBase58());
                await registerMultisig(
                    publicKey.toBase58(),
                    multisigPda,
                    adminStrings,
                    thresholdValue
                );
                toast.success("Multisig registered", {
                    description: "All admins can now auto-discover it.",
                    duration: 5000,
                });
            } catch (regErr) {
                console.error("Failed to register multisig:", regErr);
                toast.warning("Registration failed", {
                    description:
                        "Admins will need to manually enter the authority key.",
                });
            }
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [
        publicKey,
        existingMultisig,
        adminsInput,
        threshold,
        initialize,
        multisigPda,
        registerMultisig,
    ]);

    const isSubmitting = loading || registering;
    const buttonLabel = loading
        ? "Initializing…"
        : registering
            ? "Registering…"
            : "Initialize Multisig";

    return (
        <Card className="w-full">
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" />
                            <CardTitle className="text-base font-semibold tracking-tight">
                                Initialize Multisig
                            </CardTitle>
                        </div>
                        <CardDescription className="text-sm">
                            Configure the admin multisig account. Derived from{" "}
                            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                                ["multisig", payer]
                            </code>
                            .
                        </CardDescription>
                    </div>
                    {existingMultisig && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                            Active
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {/* Address info */}
                {publicKey && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 uppercase tracking-wide">Configuration</p>
                            <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                                Setup Phase
                            </Badge>
                        </div>
                        <MonoAddress
                            label="Authority"
                            value={publicKey.toBase58()}
                        />
                        <Separator className="opacity-40" />
                        <MonoAddress
                            label="Multisig PDA"
                            value={multisigPda}
                        />
                        <p className="text-xs text-muted-foreground pt-1">
                            Metadata will be auto-registered so all admins can
                            discover this multisig.
                        </p>
                    </div>
                )}

                {/* Existing multisig warning */}
                {existingMultisig && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Multisig Status</p>
                            <Badge className="bg-green-600 hover:bg-green-700">
                                ✓ Active
                            </Badge>
                        </div>
                        <Alert>
                            <AlertDescription className="text-sm">
                                An on-chain multisig already exists for this
                                authority —{" "}
                                <span className="font-medium">
                                    {existingMultisig.adminCount} admins
                                </span>
                                , threshold{" "}
                                <span className="font-medium">
                                    {existingMultisig.threshold}
                                </span>
                                .
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                <Separator />

                {/* Form fields */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="admins" className="text-sm font-medium">
                            Admin Public Keys
                        </Label>
                        <Input
                            id="admins"
                            value={adminsInput}
                            onChange={(e) => setAdminsInput(e.target.value)}
                            placeholder="Key1, Key2, Key3"
                            className="font-mono text-xs h-9"
                        />
                        <p className="text-xs text-muted-foreground">
                            Comma-separated. Maximum {MAX_ADMINS} admins.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label
                            htmlFor="threshold"
                            className="text-sm font-medium"
                        >
                            Approval Threshold
                        </Label>
                        <Input
                            id="threshold"
                            type="number"
                            min={1}
                            max={MAX_ADMINS}
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            className="h-9 w-28"
                        />
                        <p className="text-xs text-muted-foreground">
                            Number of signatures required to execute a
                            transaction. Set equal to admin count for unanimous
                            approval.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={handleInit}
                    disabled={isSubmitting || !publicKey}
                    className="w-full sm:w-auto"
                >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {buttonLabel}
                </Button>
            </CardContent>
        </Card>
    );
}