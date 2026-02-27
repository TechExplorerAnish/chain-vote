"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PhaseBadge from "@/components/phase-badge";
import PhaseTiming from "@/components/phase-timing";
import VoterManagementDashboard from "@/components/voter-management-dashboard";
import { VoterConfirmationDialog } from "@/components/voter-confirmation-dialog";
import { useElectionAccount } from "@/hooks/use-election-account";
import { useRegisteredVoters } from "@/hooks/use-registered-voters";
import {
    useInitializeMultisig,
    useCreateProposal,
    useApproveProposal,
    useExecuteProposal,
    useInitializeElection,
    usePhaseTransition,
    useAddCandidate,
    useRegisterVoter,
    usePublishTallyRoot,
    useMultisigAccount,
    useProposalAccount,
    hashInitializeElectionAction,
    hashTransitionPhaseAction,
    hashPublishTallyRootAction,
} from "@/hooks/use-admin";
import type { ProposalAccountData } from "@/hooks/use-admin";
import { GovernanceAction, ElectionPhase, PHASE_LABELS } from "@/lib/types";
import { getMultisigPda, getElectionPda, getProposalPda } from "@/lib/pda";
import { parseError } from "@/lib/utils";

export default function AdminPage() {
    const { connected, publicKey } = useWallet();
    const [adminKeyInput, setAdminKeyInput] = useState("");

    useEffect(() => {
        if (publicKey) setAdminKeyInput(publicKey.toBase58());
    }, [publicKey]);

    if (!connected || !publicKey) {
        return (
            <div className="mx-auto max-w-4xl p-6">
                <Alert>
                    <AlertDescription>Connect your admin wallet to continue.</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">
                    Governance controls for the Chain Vote protocol
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="admin-key">Admin Public Key</Label>
                <Input
                    id="admin-key"
                    value={adminKeyInput}
                    onChange={(e) => setAdminKeyInput(e.target.value)}
                    placeholder="Admin public key"
                    className="font-mono text-sm"
                />
            </div>

            <Tabs defaultValue="multisig">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="multisig">Multisig</TabsTrigger>
                    <TabsTrigger value="election">Election</TabsTrigger>
                    <TabsTrigger value="governance">Governance</TabsTrigger>
                    <TabsTrigger value="candidates">Candidates</TabsTrigger>
                    <TabsTrigger value="voters">Voters</TabsTrigger>
                </TabsList>

                <TabsContent value="multisig" className="mt-4">
                    <MultisigSection />
                </TabsContent>

                <TabsContent value="election" className="mt-4">
                    <ElectionSection adminKey={adminKeyInput} />
                </TabsContent>

                <TabsContent value="governance" className="mt-4">
                    <GovernanceSection adminKey={adminKeyInput} />
                </TabsContent>

                <TabsContent value="candidates" className="mt-4">
                    <CandidateSection adminKey={adminKeyInput} />
                </TabsContent>

                <TabsContent value="voters" className="mt-4">
                    <VotersTabContent adminKey={adminKeyInput} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

/* ── Multisig Setup ──────────────────────────────────────── */

function MultisigSection() {
    const { publicKey } = useWallet();
    const { initialize, loading } = useInitializeMultisig();
    const [adminsInput, setAdminsInput] = useState("");
    const [threshold, setThreshold] = useState("1");
    const MAX_ADMINS = 5;

    const handleInit = useCallback(async () => {
        if (!publicKey) return;
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
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, adminsInput, threshold, initialize]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Initialize Multisig</CardTitle>
                <CardDescription>
                    Set up the admin multisig. PDA seed: [&quot;multisig&quot;, payer].
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                </div>
                <Button onClick={handleInit} disabled={loading}>
                    {loading ? "Initializing…" : "Initialize Multisig"}
                </Button>
            </CardContent>
        </Card>
    );
}

/* ── Election Init + Status ──────────────────────────────── */

function ElectionSection({ adminKey }: { adminKey: string }) {
    const { election, loading: elLoading, refetch } = useElectionAccount(adminKey);
    const { initializeElection, loading } = useInitializeElection();
    const { publicKey } = useWallet();

    const [msAuthority, setMsAuthority] = useState("");
    const [proposalNonce, setProposalNonce] = useState("0");
    const [title, setTitle] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const handleInit = useCallback(async () => {
        if (!publicKey) return;
        try {
            const tx = await initializeElection(
                new PublicKey(msAuthority),
                BigInt(proposalNonce),
                title,
                BigInt(Math.floor(new Date(startTime).getTime() / 1000)),
                BigInt(Math.floor(new Date(endTime).getTime() / 1000))
            );
            toast.success("Election initialized!", { description: `Tx: ${tx.slice(0, 16)}…` });
            refetch();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, proposalNonce, title, startTime, endTime, initializeElection, refetch]);

    return (
        <div className="space-y-4">
            {election && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Current Election</span>
                                <PhaseBadge phase={election.phase} />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Title</span>
                                <span>{election.title}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Candidates</span>
                                <span>{election.candidateCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Committed</span>
                                <span>{election.totalCommittedVotes.toString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Revealed</span>
                                <span>{election.totalRevealedVotes.toString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tally Root</span>
                                <Badge variant={election.finalTallyRootSet ? "default" : "outline"}>
                                    {election.finalTallyRootSet ? "Set" : "Pending"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                    <PhaseTiming election={election} />
                </>
            )}

            {!election && !elLoading && (
                <Card>
                    <CardHeader>
                        <CardTitle>Initialize Election</CardTitle>
                        <CardDescription>
                            Requires an executed governance proposal of type InitializeElection.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Multisig Authority Key</Label>
                            <Input
                                value={msAuthority}
                                onChange={(e) => setMsAuthority(e.target.value)}
                                placeholder="Multisig authority public key"
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Proposal Nonce</Label>
                            <Input
                                type="number"
                                value={proposalNonce}
                                onChange={(e) => setProposalNonce(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Election title"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button onClick={handleInit} disabled={loading}>
                            {loading ? "Initializing…" : "Initialize Election"}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/* ── Governance Proposals ─────────────────────────────────── */

const ACTION_LABELS: Record<GovernanceAction, string> = {
    [GovernanceAction.InitializeElection]: "Initialize Election",
    [GovernanceAction.TransitionPhase]: "Transition Phase",
    [GovernanceAction.PublishTallyRoot]: "Publish Tally Root",
};

function ProposalStatusCard({
    proposal,
    proposalPda,
    loading,
    error,
}: {
    proposal: ProposalAccountData | null;
    proposalPda: PublicKey | null;
    loading: boolean;
    error: string | null;
}) {
    if (loading) {
        return (
            <Card>
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">Loading proposal…</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-4">
                    <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (!proposal) return null;

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isExpired = proposal.expiresAt > 0n && now > proposal.expiresAt;
    const approvedCount = proposal.approvals.filter(Boolean).length;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <span>Proposal #{proposal.nonce.toString()}</span>
                    <div className="flex gap-2">
                        {proposal.executed && (
                            <Badge variant="default">Executed</Badge>
                        )}
                        {proposal.consumed && (
                            <Badge variant="secondary">Consumed</Badge>
                        )}
                        {!proposal.executed && !isExpired && (
                            <Badge variant="outline">Pending</Badge>
                        )}
                        {isExpired && !proposal.executed && (
                            <Badge variant="destructive">Expired</Badge>
                        )}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Action</span>
                    <Badge variant="outline">{ACTION_LABELS[proposal.action]}</Badge>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Proposer</span>
                    <span className="font-mono text-xs">
                        {proposal.proposer.toBase58().slice(0, 8)}…{proposal.proposer.toBase58().slice(-4)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Approvals</span>
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{approvedCount}</span>
                        <div className="flex gap-1">
                            {proposal.approvals.map((approved, i) => (
                                <div
                                    key={i}
                                    className={`h-2 w-2 rounded-full ${approved
                                        ? "bg-primary"
                                        : "bg-muted"
                                        }`}
                                    title={`Admin ${i}: ${approved ? "Approved" : "Pending"}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(Number(proposal.createdAt) * 1000).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className={isExpired ? "text-destructive" : ""}>
                        {new Date(Number(proposal.expiresAt) * 1000).toLocaleString()}
                    </span>
                </div>
                {proposalPda && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">PDA</span>
                        <span className="font-mono text-xs">
                            {proposalPda.toBase58().slice(0, 12)}…{proposalPda.toBase58().slice(-4)}
                        </span>
                    </div>
                )}
                {proposal.executed && proposal.consumed && (
                    <Alert>
                        <AlertDescription>
                            This proposal has been executed and consumed. It cannot be used again.
                        </AlertDescription>
                    </Alert>
                )}
                {proposal.executed && !proposal.consumed && (
                    <Alert>
                        <AlertDescription>
                            This proposal is executed and ready to be consumed by its target instruction.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

function GovernanceSection({ adminKey }: { adminKey: string }) {
    const { publicKey } = useWallet();
    const { createProposal, loading: createLoading } = useCreateProposal();
    const { approveProposal, loading: approveLoading } = useApproveProposal();
    const { executeProposal, loading: executeLoading } = useExecuteProposal();
    const { transitionPhase, loading: transitionLoading } = usePhaseTransition();
    const { publishTallyRoot, loading: publishLoading } = usePublishTallyRoot();
    const { election, refetch: refetchElection } = useElectionAccount(adminKey);

    // Create proposal form
    const [msAuthority, setMsAuthority] = useState("");
    const [actionType, setActionType] = useState<string>("");
    const [expiryHours, setExpiryHours] = useState("24");

    // Election details for InitializeElection proposal
    const [electionTitle, setElectionTitle] = useState("");
    const [electionStartTime, setElectionStartTime] = useState("");
    const [electionEndTime, setElectionEndTime] = useState("");

    // Phase for TransitionPhase proposal creation (hash input)
    const [proposalPhase, setProposalPhase] = useState<string>("");

    // Approve/Execute
    const [proposalNonceInput, setProposalNonceInput] = useState("0");

    // Transition execution
    const [nextPhase, setNextPhase] = useState<string>("");

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

    const handleCreateProposal = useCallback(async () => {
        if (!publicKey || !msAuthority || !actionType) return;

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

            // Compute action hash based on type
            let actionHash: Uint8Array;
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
                const [elPda] = getElectionPda(new PublicKey(adminKey));
                actionHash = await hashPublishTallyRootAction(
                    elPda,
                    new Uint8Array(32),
                    ""
                );
            }

            const expiresAt = BigInt(
                Math.floor(Date.now() / 1000) + parseInt(expiryHours, 10) * 3600
            );

            // We need current nonce from multisig — use 0 as default
            const tx = await createProposal(multisigPda, nonceBigInt, action, actionHash, expiresAt);
            toast.success("Proposal created!", { description: `Tx: ${tx.slice(0, 16)}…` });
            fetchProposal();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, actionType, proposalPhase, expiryHours, proposalNonceInput, adminKey, createProposal, electionTitle, electionStartTime, electionEndTime, fetchProposal]);

    const handleApprove = useCallback(async () => {
        if (!publicKey || !msAuthority) return;
        try {
            const [multisigPda] = getMultisigPda(new PublicKey(msAuthority));
            const [proposalPda] = getProposalPda(multisigPda, BigInt(proposalNonceInput));
            const tx = await approveProposal(multisigPda, proposalPda);
            toast.success("Proposal approved!", { description: `Tx: ${tx.slice(0, 16)}…` });
            fetchProposal();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, proposalNonceInput, approveProposal, fetchProposal]);

    const handleExecute = useCallback(async () => {
        if (!publicKey || !msAuthority) return;
        try {
            const [multisigPda] = getMultisigPda(new PublicKey(msAuthority));
            const [proposalPda] = getProposalPda(multisigPda, BigInt(proposalNonceInput));
            const tx = await executeProposal(multisigPda, proposalPda);
            toast.success("Proposal executed!", { description: `Tx: ${tx.slice(0, 16)}…` });
            fetchProposal();
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, proposalNonceInput, executeProposal, fetchProposal]);

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

        // ── Client-side hash pre-check ──
        // Compute the expected action hash and compare to what's stored in the
        // proposal BEFORE sending the transaction.  This catches mismatches caused
        // by re-using a proposal that was created for a different target phase.
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

    return (
        <div className="space-y-4">
            {/* Shared multisig authority input */}
            <div className="space-y-2">
                <Label>Multisig Authority Key</Label>
                <Input
                    value={msAuthority}
                    onChange={(e) => setMsAuthority(e.target.value)}
                    placeholder="Multisig authority public key"
                    className="font-mono text-xs"
                />
            </div>

            <div className="space-y-2">
                <Label>Proposal Nonce</Label>
                <Input
                    type="number"
                    value={proposalNonceInput}
                    onChange={(e) => setProposalNonceInput(e.target.value)}
                />
            </div>

            {/* Live proposal status */}
            <ProposalStatusCard
                proposal={proposal}
                proposalPda={proposalPda}
                loading={proposalLoading}
                error={proposalError}
            />

            <Separator />

            {/* Create Proposal */}
            <Card>
                <CardHeader>
                    <CardTitle>Create Governance Proposal</CardTitle>
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

                    <div className="space-y-2">
                        <Label>Expiry (hours)</Label>
                        <Input
                            type="number"
                            value={expiryHours}
                            onChange={(e) => setExpiryHours(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleCreateProposal} disabled={createLoading}>
                        {createLoading ? "Creating…" : "Create Proposal"}
                    </Button>
                </CardContent>
            </Card>

            {/* Approve + Execute */}
            <Card>
                <CardHeader>
                    <CardTitle>Approve & Execute</CardTitle>
                    {proposal && (
                        <CardDescription>
                            {proposal.executed && proposal.consumed
                                ? "This proposal has already been executed and consumed."
                                : proposal.executed
                                    ? "This proposal has been executed. Ready to be consumed."
                                    : `${proposal.approvalCount} approval(s) recorded.`}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleApprove}
                        disabled={approveLoading || proposal?.executed === true}
                    >
                        {approveLoading ? "Approving…" : "Approve Proposal"}
                    </Button>
                    <Button
                        onClick={handleExecute}
                        disabled={executeLoading || proposal?.executed === true}
                    >
                        {executeLoading ? "Executing…" : "Execute Proposal"}
                    </Button>
                </CardContent>
            </Card>

            <Separator />

            {/* Phase Transition */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Phase Transition</span>
                        {election && <PhaseBadge phase={election.phase} />}
                    </CardTitle>
                    <CardDescription>
                        Advance the election lifecycle. Requires an executed TransitionPhase proposal.
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
        </div>
    );
}

/* ── Candidate Registration ──────────────────────────────── */

function CandidateSection({ adminKey }: { adminKey: string }) {
    const { addCandidate, loading } = useAddCandidate();
    const { election, refetch } = useElectionAccount(adminKey);
    const { publicKey, connected } = useWallet();

    const [name, setName] = useState("");
    const [party, setParty] = useState("");

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
        election?.phase === ElectionPhase.RegistrationPhase && connected;

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
                {connected && !canAdd && election && (
                    <Alert>
                        <AlertDescription>
                            Candidates can only be added during Registration phase. Current phase: {PHASE_LABELS[election.phase] || "Unknown"}
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

/* ── Voter Registration ──────────────────────────────────── */

function VoterSection({ adminKey, onVoterRegistered }: { adminKey: string; onVoterRegistered?: () => void }) {
    const { registerVoter, loading } = useRegisterVoter();
    const { election } = useElectionAccount(adminKey);
    const { publicKey, connected } = useWallet();

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
        election?.phase === ElectionPhase.RegistrationPhase && connected;

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
                            Voters can only be registered during Registration phase. Current phase: {PHASE_LABELS[election.phase] || "Unknown"}
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

/* ── Voters Tab Wrapper ──────────────────────────────────── */

function VotersTabContent({ adminKey }: { adminKey: string }) {
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
