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
import { useElectionAccount } from "@/hooks/use-election-account";
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
    hashInitializeElectionAction,
    hashTransitionPhaseAction,
    hashPublishTallyRootAction,
} from "@/hooks/use-admin";
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
                    <VoterSection adminKey={adminKeyInput} />
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

    // Approve/Execute
    const [proposalNonceInput, setProposalNonceInput] = useState("0");

    // Transition
    const [nextPhase, setNextPhase] = useState<string>("");
    const [transNonce, setTransNonce] = useState("0");

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
                const [elPda] = getElectionPda(new PublicKey(adminKey));
                const phase = parseInt(nextPhase || "1", 10) as ElectionPhase;
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
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, actionType, nextPhase, expiryHours, proposalNonceInput, adminKey, createProposal, electionTitle, electionStartTime, electionEndTime]);

    const handleApprove = useCallback(async () => {
        if (!publicKey || !msAuthority) return;
        try {
            const [multisigPda] = getMultisigPda(new PublicKey(msAuthority));
            const [proposalPda] = getProposalPda(multisigPda, BigInt(proposalNonceInput));
            const tx = await approveProposal(multisigPda, proposalPda);
            toast.success("Proposal approved!", { description: `Tx: ${tx.slice(0, 16)}…` });
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, proposalNonceInput, approveProposal]);

    const handleExecute = useCallback(async () => {
        if (!publicKey || !msAuthority) return;
        try {
            const [multisigPda] = getMultisigPda(new PublicKey(msAuthority));
            const [proposalPda] = getProposalPda(multisigPda, BigInt(proposalNonceInput));
            const tx = await executeProposal(multisigPda, proposalPda);
            toast.success("Proposal executed!", { description: `Tx: ${tx.slice(0, 16)}…` });
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, msAuthority, proposalNonceInput, executeProposal]);

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
        try {
            const phase = parseInt(nextPhase, 10) as ElectionPhase;
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
    }, [publicKey, nextPhase, msAuthority, adminKey, transNonce, transitionPhase, refetchElection]);

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
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleApprove}
                        disabled={approveLoading}
                    >
                        {approveLoading ? "Approving…" : "Approve Proposal"}
                    </Button>
                    <Button
                        onClick={handleExecute}
                        disabled={executeLoading}
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
                    <div className="space-y-2">
                        <Label>Transition Proposal Nonce</Label>
                        <Input
                            type="number"
                            value={transNonce}
                            onChange={(e) => setTransNonce(e.target.value)}
                        />
                    </div>
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

function VoterSection({ adminKey }: { adminKey: string }) {
    const { registerVoter, loading } = useRegisterVoter();
    const { election } = useElectionAccount(adminKey);
    const { publicKey, connected } = useWallet();

    const [voterKey, setVoterKey] = useState("");

    const handleRegister = useCallback(async () => {
        if (!publicKey || !connected) {
            toast.error("Wallet Not Connected", {
                description: "Please connect your wallet first.",
            });
            return;
        }
        try {
            const tx = await registerVoter(
                new PublicKey(adminKey),
                new PublicKey(voterKey)
            );
            toast.success("Voter registered!", { description: `Tx: ${tx.slice(0, 16)}…` });
            setVoterKey("");
        } catch (err) {
            const { title, description } = parseError(err);
            toast.error(title, { description });
        }
    }, [publicKey, connected, adminKey, voterKey, registerVoter]);

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
                <Button onClick={handleRegister} disabled={loading || !canRegister || !connected}>
                    {loading ? "Registering…" : "Register Voter"}
                </Button>
            </CardContent>
        </Card>
    );
}
