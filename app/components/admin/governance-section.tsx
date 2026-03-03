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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Scale, FileText, Vote as VoteIcon, CheckCircle2, Send, AlertCircle } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCreateProposal, useApproveProposal, useExecuteProposal, usePhaseTransition, usePublishTallyRoot, useMultisigAccount, useProposalAccount, hashInitializeElectionAction, hashTransitionPhaseAction, hashPublishTallyRootAction } from "@/hooks/use-admin";
import { useElectionAccount } from "@/hooks/use-election-account";
import { useUploadProof } from "@/hooks/use-upload-proof";
import PhaseBadge from "@/components/phase-badge";
import { GovernanceAction, ElectionPhase, PHASE_LABELS } from "@/lib/types";
import { getMultisigPda, getElectionPda, getProposalPda } from "@/lib/pda";
import { getConnection, getReadOnlyProgram } from "@/lib/program";
import { parseError } from "@/lib/utils";
import { ProposalStatusCard } from "./proposal-status-card";

function hexToBytes(hex: string): Uint8Array {
    const normalized = hex.trim().toLowerCase();
    return new Uint8Array(
        normalized.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
}

function toPubkeyString(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object" && "toBase58" in value && typeof (value as { toBase58?: unknown }).toBase58 === "function") {
        return (value as { toBase58: () => string }).toBase58();
    }
    return null;
}

async function getChainNowSec(): Promise<bigint> {
    try {
        const connection = getConnection();
        const slot = await connection.getSlot("processed");
        const blockTime = await connection.getBlockTime(slot);
        if (typeof blockTime === "number") {
            return BigInt(blockTime);
        }
    } catch {
        // Fall back to local clock if RPC time lookup fails.
    }
    return BigInt(Math.floor(Date.now() / 1000));
}

export function GovernanceSection({ adminKey, onProposalChanged }: { adminKey: string; onProposalChanged?: () => Promise<void> }) {
    const { publicKey } = useWallet();
    const { createProposal, loading: createLoading } = useCreateProposal();
    const { approveProposal, loading: approveLoading } = useApproveProposal();
    const { executeProposal, loading: executeLoading } = useExecuteProposal();
    const { transitionPhase, loading: transitionLoading } = usePhaseTransition();
    const { publishTallyRoot, loading: publishLoading } = usePublishTallyRoot();
    const { election, electionPda, candidates, refetch: refetchElection } = useElectionAccount(adminKey);

    // Create proposal form
    const [msAuthority, setMsAuthority] = useState("");
    const [actionType, setActionType] = useState<string>("");
    const [expiryHours, setExpiryHours] = useState("24");

    // Fetch multisig to auto-fill nonce
    const { multisig, fetchMultisig } = useMultisigAccount(msAuthority || undefined);

    // Auto-fetch multisig when authority changes
    useEffect(() => {
        if (msAuthority) {
            try {
                new PublicKey(msAuthority);
                fetchMultisig();
            } catch { /* invalid key */ }
        }
    }, [msAuthority, fetchMultisig]);

    // Election details for InitializeElection proposal
    const [electionTitle, setElectionTitle] = useState("");
    const [electionStartTime, setElectionStartTime] = useState("");
    const [electionEndTime, setElectionEndTime] = useState("");

    // Phase for TransitionPhase proposal creation (hash input)
    const [proposalPhase, setProposalPhase] = useState<string>("");

    // Approve/Execute — auto-synced from chain
    const [proposalNonceInput, setProposalNonceInput] = useState("");

    // Auto-fill nonce from multisig account
    useEffect(() => {
        if (multisig && proposalNonceInput === "") {
            setProposalNonceInput(multisig.proposalNonce.toString());
        }
    }, [multisig, proposalNonceInput]);

    // Transition execution
    const [nextPhase, setNextPhase] = useState<string>("");

    // Publish Tally Root
    const [tallyRootHex, setTallyRootHex] = useState("");
    const [proofUri, setProofUri] = useState("");
    const { upload: uploadProof, loading: uploadingProof, error: proofUploadError } = useUploadProof({
        onSuccess: (ipfsHash, uri) => {
            setProofUri(uri);
            toast.success("Proof uploaded to IPFS!", {
                description: `Hash: ${ipfsHash.slice(0, 20)}…`
            });
        },
        onError: (error) => {
            toast.error("Proof upload failed", { description: error });
        },
    });

    // For transition, use the same nonce as the proposal
    const transNonce = proposalNonceInput;

    // ── Auto-fetch proposal status when authority + nonce are set ──
    const {
        proposal,
        proposalPda,
        loading: proposalLoading,
        error: proposalError,
        fetchProposal,
    } = useProposalAccount(msAuthority || undefined, proposalNonceInput);

    useEffect(() => {
        if (msAuthority && proposalNonceInput !== "") {
            try {
                new PublicKey(msAuthority); // validate key format
                fetchProposal();
            } catch {
                // invalid key, skip
            }
        }
    }, [msAuthority, proposalNonceInput, fetchProposal]);

    // Live-sync proposal status for the creator/admin currently viewing governance tab.
    useEffect(() => {
        if (!msAuthority) return;

        let currentMultisig: PublicKey;
        try {
            currentMultisig = getMultisigPda(new PublicKey(msAuthority))[0];
        } catch {
            return;
        }

        const currentMultisigKey = currentMultisig.toBase58();
        let currentProposalKey: string | null = null;
        try {
            if (proposalNonceInput !== "") {
                currentProposalKey = getProposalPda(currentMultisig, BigInt(proposalNonceInput))[0].toBase58();
            }
        } catch {
            currentProposalKey = null;
        }

        const program = getReadOnlyProgram();
        const listenerHandles: number[] = [];

        const refreshCurrentView = () => {
            fetchMultisig();
            if (proposalNonceInput !== "") {
                fetchProposal();
            }
            onProposalChanged?.();
        };

        const setupListeners = async () => {
            try {
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalCreated", (event: any) => {
                        if (toPubkeyString(event?.multisig) === currentMultisigKey) {
                            refreshCurrentView();
                        }
                    })
                );
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalApproved", (event: any) => {
                        const eventProposalKey = toPubkeyString(event?.proposal);
                        if (!currentProposalKey || eventProposalKey === currentProposalKey) {
                            refreshCurrentView();
                        }
                    })
                );
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalExecuted", (event: any) => {
                        const eventProposalKey = toPubkeyString(event?.proposal);
                        if (!currentProposalKey || eventProposalKey === currentProposalKey) {
                            refreshCurrentView();
                        }
                    })
                );
            } catch {
                // Non-fatal. User can still refresh manually.
            }
        };

        setupListeners();

        return () => {
            listenerHandles.forEach((handle) => {
                program.removeEventListener(handle);
            });
        };
    }, [msAuthority, proposalNonceInput, fetchMultisig, fetchProposal, onProposalChanged]);

    const handleCreateProposal = useCallback(async () => {
        if (!publicKey || !msAuthority || !actionType) return;
        if (proposalNonceInput === "") {
            toast.error("Proposal nonce required", {
                description: "Enter the nonce for this governance proposal.",
            });
            return;
        }

        try {
            const msAuth = new PublicKey(msAuthority);
            const [multisigPda] = getMultisigPda(msAuth);
            const action = parseInt(actionType, 10) as GovernanceAction;

            const nonceBigInt = BigInt(proposalNonceInput);
            if (nonceBigInt < 0n) {
                toast.error("Invalid proposal nonce", {
                    description: "Nonce must be 0 or greater.",
                });
                return;
            }

            // Compute action hash + optional payload based on type
            let actionHash: Uint8Array;
            let initElectionTitleArg = "";
            let initElectionStartTimeArg = 0n;
            let initElectionEndTimeArg = 0n;
            if (action === GovernanceAction.InitializeElection) {
                // Validate election details are provided
                if (!electionTitle || !electionStartTime || !electionEndTime) {
                    toast.error("Election details required", {
                        description: "Provide title, start time, and end time for InitializeElection proposal",
                    });
                    return;
                }

                const startTimeUnix = BigInt(Math.floor(new Date(electionStartTime).getTime() / 1000));
                const endTimeUnix = BigInt(Math.floor(new Date(electionEndTime).getTime() / 1000));
                const chainNow = await getChainNowSec();

                if (startTimeUnix <= chainNow + 30n) {
                    toast.error("Start time too close to current chain time", {
                        description:
                            "Set election start at least 30 seconds in the future to avoid StartTimeInPast at initialization.",
                    });
                    return;
                }

                initElectionTitleArg = electionTitle;
                initElectionStartTimeArg = startTimeUnix;
                initElectionEndTimeArg = endTimeUnix;

                actionHash = await hashInitializeElectionAction(
                    publicKey,
                    electionTitle,
                    startTimeUnix,
                    endTimeUnix
                );
            } else if (action === GovernanceAction.TransitionPhase) {
                if (!proposalPhase) {
                    toast.error("Target phase required", {
                        description: "Select the target phase for the TransitionPhase proposal.",
                    });
                    return;
                }
                const [elPda] = getElectionPda(new PublicKey(adminKey));
                const phase = parseInt(proposalPhase, 10) as ElectionPhase;
                actionHash = await hashTransitionPhaseAction(elPda, phase);
            } else {
                if (!tallyRootHex || tallyRootHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(tallyRootHex)) {
                    toast.error("Invalid tally root", {
                        description: "For PublishTallyRoot, enter a valid 64-char hex tally root.",
                    });
                    return;
                }
                if (!proofUri) {
                    toast.error("Missing proof URI", {
                        description: "For PublishTallyRoot, enter proof URI used to compute the action hash.",
                    });
                    return;
                }
                const [elPda] = getElectionPda(new PublicKey(adminKey));
                const tallyRootBytes = hexToBytes(tallyRootHex);
                actionHash = await hashPublishTallyRootAction(
                    elPda,
                    tallyRootBytes,
                    proofUri
                );
            }

            const expiresAt = BigInt(
                Math.floor(Date.now() / 1000) + parseInt(expiryHours, 10) * 3600
            );

            const tx = await createProposal(
                multisigPda,
                nonceBigInt,
                action,
                actionHash,
                expiresAt,
                initElectionTitleArg,
                initElectionStartTimeArg,
                initElectionEndTimeArg
            );
            toast.success("Proposal created!", { description: `Tx: ${tx.slice(0, 16)}…` });

            setProposalNonceInput(nonceBigInt.toString());
            fetchProposal();
            fetchMultisig(); // re-fetch to auto-update nonce
            onProposalChanged?.();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, actionType, proposalPhase, expiryHours, proposalNonceInput, adminKey, createProposal, electionTitle, electionStartTime, electionEndTime, tallyRootHex, proofUri, fetchProposal, fetchMultisig, onProposalChanged]);

    const handleApprove = useCallback(async () => {
        if (!publicKey || !msAuthority) return;
        try {
            const [multisigPda] = getMultisigPda(new PublicKey(msAuthority));
            const [proposalPda] = getProposalPda(multisigPda, BigInt(proposalNonceInput));
            const tx = await approveProposal(multisigPda, proposalPda);
            toast.success("Proposal approved!", { description: `Tx: ${tx.slice(0, 16)}…` });
            fetchProposal();
            onProposalChanged?.();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, proposalNonceInput, approveProposal, fetchProposal, onProposalChanged]);

    const handleExecute = useCallback(async () => {
        if (!publicKey || !msAuthority) return;
        try {
            const [multisigPda] = getMultisigPda(new PublicKey(msAuthority));
            const [proposalPda] = getProposalPda(multisigPda, BigInt(proposalNonceInput));
            const tx = await executeProposal(multisigPda, proposalPda);
            toast.success("Proposal executed!", { description: `Tx: ${tx.slice(0, 16)}…` });
            fetchProposal();
            onProposalChanged?.();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, proposalNonceInput, executeProposal, fetchProposal, onProposalChanged]);

    const handleTransition = useCallback(async () => {
        if (!publicKey) {
            toast.error("Wallet not connected", { description: "Connect your wallet to continue." });
            return;
        }
        if (!msAuthority) {
            toast.error("Missing multisig authority", { description: "Enter the multisig authority key." });
            return;
        }
        if (!nextPhase) {
            toast.error("Missing target phase", { description: "Select the target phase to transition to." });
            return;
        }
        if (!transNonce) {
            toast.error("Missing proposal nonce", { description: "Enter the transition proposal nonce." });
            return;
        }

        const phase = parseInt(nextPhase, 10) as ElectionPhase;

        if (proposal) {
            const [elPda] = getElectionPda(new PublicKey(adminKey));
            const expectedHash = await hashTransitionPhaseAction(elPda, phase);
            const storedHash = new Uint8Array(proposal.actionHash);
            const hashesMatch =
                expectedHash.length === storedHash.length &&
                expectedHash.every((b, i) => b === storedHash[i]);

            if (!hashesMatch) {
                toast.error("Action hash mismatch", {
                    description:
                        `Proposal #${transNonce} was created for a different target phase. ` +
                        `Create a new TransitionPhase proposal with "${PHASE_LABELS[phase]}" selected.`,
                    duration: 8000,
                });
                return;
            }
        }

        try {
            const tx = await transitionPhase(
                new PublicKey(adminKey),
                new PublicKey(msAuthority),
                phase,
                BigInt(transNonce)
            );
            toast.success("Phase transitioned!", { description: `Tx: ${tx.slice(0, 16)}…` });
            refetchElection();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, nextPhase, msAuthority, adminKey, transNonce, proposal, transitionPhase, refetchElection]);

    const handlePublishTally = useCallback(async () => {
        if (!publicKey) {
            toast.error("Wallet not connected", { description: "Connect your wallet to continue." });
            return;
        }
        if (!msAuthority) {
            toast.error("Missing multisig authority", { description: "Enter the multisig authority key." });
            return;
        }
        if (!tallyRootHex || tallyRootHex.length !== 64) {
            toast.error("Invalid tally root", { description: "Must be 64 hex characters (32 bytes)." });
            return;
        }
        if (!/^[0-9a-fA-F]{64}$/.test(tallyRootHex)) {
            toast.error("Invalid tally root", { description: "Tally root must be hexadecimal (0-9, a-f)." });
            return;
        }
        if (!proofUri) {
            toast.error("Missing proof URI", { description: "Enter the proof URI (IPFS/URL)." });
            return;
        }
        if (!proposalNonceInput) {
            toast.error("Missing proposal nonce", { description: "Enter the executed PublishTallyRoot proposal nonce." });
            return;
        }

        try {
            const tallyRootBytes = hexToBytes(tallyRootHex);
            const [multisigPda] = getMultisigPda(new PublicKey(msAuthority));
            const [elPda] = getElectionPda(new PublicKey(adminKey));

            if (proposal) {
                const expectedHash = await hashPublishTallyRootAction(elPda, tallyRootBytes, proofUri);
                const storedHash = new Uint8Array(proposal.actionHash);
                const hashesMatch =
                    expectedHash.length === storedHash.length &&
                    expectedHash.every((b, i) => b === storedHash[i]);

                if (!hashesMatch) {
                    toast.error("Action hash mismatch", {
                        description:
                            `Proposal #${proposalNonceInput} was created with different tally root/proof URI. ` +
                            "Use the exact same values used when creating PublishTallyRoot proposal.",
                        duration: 8000,
                    });
                    return;
                }
            }

            const tx = await publishTallyRoot(
                new PublicKey(adminKey),
                multisigPda,
                BigInt(proposalNonceInput),
                tallyRootBytes,
                proofUri
            );
            toast.success("Tally root published!", { description: `Tx: ${tx.slice(0, 16)}…` });
            refetchElection();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, adminKey, proposalNonceInput, tallyRootHex, proofUri, proposal, publishTallyRoot, refetchElection]);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>Multisig Authority Key</Label>
                <Input
                    value={msAuthority}
                    onChange={(e) => setMsAuthority(e.target.value)}
                    placeholder="Enter multisig authority public key"
                    className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                    Use the Notifications tab for automatic proposal discovery and approvals.
                </p>
            </div>

            {multisig && multisig.threshold < multisig.adminCount && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Current multisig threshold is {multisig.threshold}/{multisig.adminCount}. Proposal execution does not require all admins.
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>Proposal Nonce</Label>
                    {multisig && (
                        <span className="text-xs text-muted-foreground">
                            Next on-chain: {multisig.proposalNonce.toString()}
                        </span>
                    )}
                </div>
                <Input
                    type="number"
                    value={proposalNonceInput}
                    onChange={(e) => setProposalNonceInput(e.target.value)}
                />
            </div>

            <ProposalStatusCard
                proposal={proposal}
                proposalPda={proposalPda}
                loading={proposalLoading}
                error={proposalError}
                multisig={multisig}
            />

            <Separator />

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <CardTitle>Create Governance Proposal</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Action Type</Label>
                        <Select value={actionType} onValueChange={setActionType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">Initialize Election</SelectItem>
                                <SelectItem value="1">Transition Phase</SelectItem>
                                <SelectItem value="2">Publish Tally Root</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {parseInt(actionType, 10) === GovernanceAction.TransitionPhase && (
                        <div className="space-y-2">
                            <Label>Target Phase (for action hash)</Label>
                            <Select value={proposalPhase} onValueChange={setProposalPhase}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select target phase" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map((p) => (
                                        <SelectItem key={p} value={p.toString()}>
                                            {PHASE_LABELS[p as ElectionPhase]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                This must match the phase you transition to later.
                            </p>
                        </div>
                    )}

                    {parseInt(actionType, 10) === GovernanceAction.InitializeElection && (
                        <>
                            <div className="space-y-2">
                                <Label>Election Title</Label>
                                <Input
                                    value={electionTitle}
                                    onChange={(e) => setElectionTitle(e.target.value)}
                                    placeholder="Election title"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={electionStartTime}
                                        onChange={(e) => setElectionStartTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={electionEndTime}
                                        onChange={(e) => setElectionEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {parseInt(actionType, 10) === GovernanceAction.PublishTallyRoot && (
                        <>
                            <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertDescription>
                                    <strong>Step 1:</strong> Click "📊 Calculate from Results" to generate tally root from current vote counts.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label>Tally Root (hex, 64 chars)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={tallyRootHex}
                                        onChange={(e) => setTallyRootHex(e.target.value.trim())}
                                        placeholder="0000000000000000000000000000000000000000000000000000000000000000"
                                        className="font-mono text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            if (!candidates || candidates.length === 0) {
                                                toast.error("No candidates loaded");
                                                return;
                                            }
                                            try {
                                                const candidateData = candidates
                                                    .map((c, idx) => `${idx}:${c.name}:${Number(c.revealedVotes ?? 0)}`)
                                                    .join("|");

                                                const encoder = new TextEncoder();
                                                const data = encoder.encode(candidateData);
                                                const hashBuffer = await crypto.subtle.digest("SHA-256", data as BufferSource);
                                                const hashArray = Array.from(new Uint8Array(hashBuffer));
                                                const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

                                                setTallyRootHex(hashHex);
                                                toast.success("Tally root calculated!", {
                                                    description: `From ${candidates.length} candidates`
                                                });
                                            } catch (err) {
                                                const errorMsg = parseError(err);
                                                toast.error(`Failed to calculate tally root: ${errorMsg}`);
                                            }
                                        }}
                                        size="sm"
                                        className="whitespace-nowrap"
                                    >
                                        📊 Calculate
                                    </Button>
                                </div>
                                {tallyRootHex && (
                                    <div className="text-xs text-muted-foreground">
                                        ✓ Valid: {tallyRootHex.length}/64 chars
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Proof URI</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={proofUri}
                                        onChange={(e) => setProofUri(e.target.value)}
                                        placeholder="ipfs://... or https://..."
                                        disabled={uploadingProof}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            if (!election || !electionPda || !candidates) {
                                                toast.error("Election not loaded");
                                                return;
                                            }
                                            if (!tallyRootHex) {
                                                toast.error("Calculate tally root first");
                                                return;
                                            }
                                            if (tallyRootHex.length !== 64) {
                                                toast.error("Invalid tally root length", { description: "Must be exactly 64 hex characters" });
                                                return;
                                            }
                                            try {
                                                await uploadProof(
                                                    electionPda,
                                                    candidates.map((c) => ({
                                                        pubkey: new PublicKey(c.election),
                                                        name: c.name,
                                                        votes: Number(c.revealedVotes ?? 0),
                                                    })),
                                                    tallyRootHex
                                                );
                                            } catch (err) {
                                                console.error("Upload error:", err);
                                            }
                                        }}
                                        disabled={uploadingProof || !election || !tallyRootHex}
                                        size="sm"
                                        className="whitespace-nowrap"
                                    >
                                        {uploadingProof ? "Uploading…" : "📤 Upload"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Upload to IPFS for verifiable proof
                                </p>
                            </div>

                            {proofUri && (
                                <Alert className="border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/20">
                                    <AlertCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription>
                                        <strong>✓ Ready!</strong> Both tally root and proof URI are set. You can now create the proposal.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {proofUploadError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{proofUploadError}</AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}

                    <div className="space-y-2">
                        <Label>Expiry (hours)</Label>
                        <Input
                            type="number"
                            value={expiryHours}
                            onChange={(e) => setExpiryHours(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleCreateProposal} disabled={createLoading} size="lg">
                        <Send className="mr-2 h-4 w-4" />
                        {createLoading ? "Creating…" : "Create Proposal"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        <CardTitle>Approve & Execute</CardTitle>
                    </div>
                    {multisig && (
                        <div className="text-xs text-muted-foreground mt-1">
                            Multisig: {multisig.adminCount} admins, threshold {multisig.threshold}
                        </div>
                    )}
                    {proposal && multisig && (
                        <CardDescription>
                            {proposal.executed && proposal.consumed
                                ? "This proposal has already been executed and consumed."
                                : proposal.executed
                                    ? "This proposal has been executed. Ready to be consumed."
                                    : (() => {
                                        const remaining = multisig.threshold - proposal.approvalCount;
                                        return remaining > 0
                                            ? `${proposal.approvalCount}/${multisig.threshold} approvals. Need ${remaining} more to execute.`
                                            : `✓ Threshold reached (${proposal.approvalCount}/${multisig.threshold}). Ready to execute!`;
                                    })()}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {proposal && multisig && (
                        <div className="rounded-lg border border-cyan-200 bg-cyan-50/50 dark:border-cyan-900 dark:bg-cyan-950/20 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-cyan-600 hover:bg-cyan-700">
                                        Proposal #{proposal.nonce?.toString() || "0"}
                                    </Badge>
                                    <Badge variant="outline" className="border-cyan-300 text-cyan-700 dark:border-cyan-700 dark:text-cyan-400">
                                        {proposal.executed && proposal.consumed ? "✓ Consumed" : proposal.executed ? "✓ Executed" : "⏳ Active"}
                                    </Badge>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                    {proposal.approvalCount}/{multisig.threshold} ✓
                                </Badge>
                            </div>
                            <CardDescription className="text-xs">
                                {proposal.executed && proposal.consumed
                                    ? "This proposal has already been executed and consumed."
                                    : proposal.executed
                                        ? "This proposal has been executed. Ready to be consumed."
                                        : (() => {
                                            const remaining = multisig.threshold - proposal.approvalCount;
                                            return remaining > 0
                                                ? `${proposal.approvalCount}/${multisig.threshold} approvals. Need ${remaining} more to execute.`
                                                : `✓ Threshold reached (${proposal.approvalCount}/${multisig.threshold}). Ready to execute!`;
                                        })()}
                            </CardDescription>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="secondary"
                            onClick={handleApprove}
                            disabled={approveLoading || proposal?.executed === true}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            {approveLoading ? "Approving…" : "Approve Proposal"}
                        </Button>
                        <Button
                            onClick={handleExecute}
                            disabled={executeLoading || proposal?.executed === true || Boolean(multisig && proposal && proposal.approvalCount < multisig.threshold)}
                        >
                            <VoteIcon className="mr-2 h-4 w-4" />
                            {executeLoading ? "Executing…" : "Execute Proposal"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {(actionType === "2" || (proposal && proposal.action === GovernanceAction.PublishTallyRoot)) && (
                <>
                    <Separator />
                    <Card>
                        <CardHeader>
                            <CardTitle>Publish Tally Root</CardTitle>
                            <CardDescription>
                                Commit final tally root before transitioning to Finalized phase.
                                Requires an executed PublishTallyRoot proposal.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
                                <AlertCircle className="h-4 w-4 text-blue-600" />
                                <AlertDescription>
                                    <strong>Tally Root:</strong> A 64-character hexadecimal string (32 bytes) representing the root hash of all election results.
                                    <br />
                                    Click <strong>"Calculate from Results"</strong> to auto-generate from current candidate vote counts.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Label>Tally Root (hex, 64 chars)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={tallyRootHex}
                                        onChange={(e) => setTallyRootHex(e.target.value.trim())}
                                        placeholder="0000000000000000000000000000000000000000000000000000000000000000"
                                        className="font-mono text-xs"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            if (!candidates || candidates.length === 0) {
                                                toast.error("No candidates loaded");
                                                return;
                                            }
                                            try {
                                                // Calculate hash from candidates' revealed votes
                                                const candidateData = candidates
                                                    .map((c, idx) => `${idx}:${c.name}:${Number(c.revealedVotes ?? 0)}`)
                                                    .join("|");

                                                // Create a deterministic hash from candidate data
                                                const encoder = new TextEncoder();
                                                const data = encoder.encode(candidateData);
                                                const hashBuffer = await crypto.subtle.digest("SHA-256", data as BufferSource);
                                                const hashArray = Array.from(new Uint8Array(hashBuffer));
                                                const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

                                                setTallyRootHex(hashHex);
                                                toast.success("Tally root calculated!", {
                                                    description: `From ${candidates.length} candidates`
                                                });
                                            } catch (err) {
                                                const errorMsg = parseError(err);
                                                toast.error(`Failed to calculate tally root: ${errorMsg}`);
                                            }
                                        }}
                                        size="sm"
                                        className="whitespace-nowrap"
                                    >
                                        📊 Calculate from Results
                                    </Button>
                                </div>
                                {tallyRootHex && (
                                    <div className="text-xs text-muted-foreground">
                                        ✓ Valid hex: {tallyRootHex.length}/64 chars
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Proof URI</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={proofUri}
                                        onChange={(e) => setProofUri(e.target.value)}
                                        placeholder="ipfs://... or https://..."
                                        readOnly={uploadingProof}
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            if (!election || !electionPda || !candidates) {
                                                toast.error("Election not loaded");
                                                return;
                                            }
                                            if (!tallyRootHex) {
                                                toast.error("Calculate tally root first");
                                                return;
                                            }
                                            if (tallyRootHex.length !== 64) {
                                                toast.error("Invalid tally root length", { description: "Must be exactly 64 hex characters" });
                                                return;
                                            }
                                            try {
                                                await uploadProof(
                                                    electionPda,
                                                    candidates.map((c) => ({
                                                        pubkey: new PublicKey(c.election),
                                                        name: c.name,
                                                        votes: Number(c.revealedVotes ?? 0),
                                                    })),
                                                    tallyRootHex
                                                );
                                            } catch (err) {
                                                console.error("Upload error:", err);
                                            }
                                        }}
                                        disabled={uploadingProof || !election || !tallyRootHex}
                                        size="sm"
                                    >
                                        {uploadingProof ? "Uploading…" : "📤 Upload Proof"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Upload proof JSON to IPFS. This generates a verifiable record of the tally.
                                </p>
                            </div>

                            {proofUploadError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{proofUploadError}</AlertDescription>
                                </Alert>
                            )}

                            {proofUri && (
                                <Alert className="border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/20">
                                    <AlertCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription>
                                        <strong>Proof uploaded!</strong> Ready to publish tally root.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <p className="text-xs text-muted-foreground">
                                Uses proposal nonce: <span className="font-mono font-bold">{proposalNonceInput}</span>
                            </p>

                            <Button
                                onClick={handlePublishTally}
                                disabled={publishLoading || !tallyRootHex || !proofUri}
                                size="lg"
                                className="w-full"
                            >
                                {publishLoading ? "Publishing…" : "✓ Publish Tally Root"}
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}

            {(actionType === "1" || (proposal && proposal.action === GovernanceAction.TransitionPhase)) && (
                <>
                    <Separator />
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Phase Transition</span>
                                {election && <PhaseBadge phase={election.phase} />}
                            </CardTitle>
                            <CardDescription>
                                Advance the election lifecycle. Requires an executed TransitionPhase proposal.
                                {election?.phase === ElectionPhase.RevealPhase && (
                                    <span className="block mt-2 text-destructive">
                                        ⚠️ Before transitioning to Finalized, you must publish the tally root (see above).
                                    </span>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Target Phase</Label>
                                <Select value={nextPhase} onValueChange={setNextPhase}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select next phase" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4].map((p) => (
                                            <SelectItem key={p} value={p.toString()}>
                                                {PHASE_LABELS[p as ElectionPhase]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Note: Uses the "Proposal Nonce" value from above ({proposalNonceInput})
                            </p>
                            <Button
                                onClick={handleTransition}
                                disabled={transitionLoading}
                            >
                                {transitionLoading ? "Transitioning…" : "Transition Phase"}
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
