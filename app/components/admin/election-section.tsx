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
import { useInitializeElection, useMultisigAccount, useProposalAccount } from "@/hooks/use-admin";
import { useElectionAccount } from "@/hooks/use-election-account";
import PhaseBadge from "@/components/phase-badge";
import PhaseTiming from "@/components/phase-timing";
import { GovernanceAction } from "@/lib/types";
import { getMultisigPda } from "@/lib/pda";
import { parseError } from "@/lib/utils";
import { Vote, Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

function toLocalDateTimeInput(unixSeconds: bigint): string {
    const d = new Date(Number(unixSeconds) * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

async function getChainNowSec(): Promise<bigint> {
    try {
        const { getConnection } = await import("@/lib/program");
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

export function ElectionSection({ adminKey }: { adminKey: string }) {
    const { election, loading: elLoading, refetch } = useElectionAccount(adminKey);
    const { initializeElection, loading } = useInitializeElection();
    const { publicKey } = useWallet();

    const [msAuthority, setMsAuthority] = useState("");
    const [proposalNonce, setProposalNonce] = useState("");
    const [proposalNonceTouched, setProposalNonceTouched] = useState(false);
    const [title, setTitle] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [autofillHint, setAutofillHint] = useState<string | null>(null);

    // Auto-fill nonce from multisig
    const { multisig, fetchMultisig } = useMultisigAccount(msAuthority || undefined);
    const { proposal, fetchProposal } = useProposalAccount(msAuthority || undefined, proposalNonce);

    useEffect(() => {
        if (msAuthority) {
            try {
                new PublicKey(msAuthority);
                fetchMultisig();
            } catch { /* invalid key */ }
        }
    }, [msAuthority, fetchMultisig]);

    useEffect(() => {
        if (multisig && !proposalNonceTouched) {
            const nextNonce = multisig.proposalNonce;
            const suggestedNonce = nextNonce > 0n ? nextNonce - 1n : 0n;
            setProposalNonce(suggestedNonce.toString());
        }
    }, [multisig, proposalNonceTouched]);

    useEffect(() => {
        if (!msAuthority || !proposalNonce) {
            setAutofillHint(null);
            return;
        }

        try {
            new PublicKey(msAuthority);
            fetchProposal();
        } catch {
            setAutofillHint(null);
        }
    }, [msAuthority, proposalNonce, fetchProposal]);

    useEffect(() => {
        if (!proposal || proposal.action !== GovernanceAction.InitializeElection || !proposal.hasInitElectionPayload) {
            setAutofillHint(null);
            return;
        }

        setTitle(proposal.initElectionTitle);
        setStartTime(toLocalDateTimeInput(proposal.initElectionStartTime));
        setEndTime(toLocalDateTimeInput(proposal.initElectionEndTime));
        setAutofillHint("Auto-filled from on-chain InitializeElection proposal payload.");
    }, [proposal]);

    const handleInit = useCallback(async () => {
        if (!publicKey) return;
        if (!proposalNonce) {
            toast.error("Proposal nonce required", {
                description: "Enter the executed InitializeElection proposal nonce.",
            });
            return;
        }
        try {
            const startUnix = BigInt(Math.floor(new Date(startTime).getTime() / 1000));
            const endUnix = BigInt(Math.floor(new Date(endTime).getTime() / 1000));
            const chainNow = await getChainNowSec();

            if (startUnix < chainNow) {
                toast.error("Start time is already in the past on-chain", {
                    description:
                        "This proposal can no longer initialize. Create a new InitializeElection proposal with a future start time.",
                });
                return;
            }

            const tx = await initializeElection(
                new PublicKey(msAuthority),
                BigInt(proposalNonce),
                title,
                startUnix,
                endUnix
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
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Candidates</span>
                                <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">
                                    {election.candidateCount}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Committed</span>
                                <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">
                                    {election.totalCommittedVotes.toString()}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Revealed</span>
                                <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                                    {election.totalRevealedVotes.toString()}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Tally Root</span>
                                <Badge className={election.finalTallyRootSet ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"}>
                                    {election.finalTallyRootSet ? "✓ Set" : "⏳ Pending"}
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
                            <div className="flex items-center justify-between">
                                <Label>Proposal Nonce</Label>
                                {multisig && (
                                    <span className="text-xs text-muted-foreground">
                                        Next on-chain: {multisig.proposalNonce.toString()} · Usually use {multisig.proposalNonce > 0n ? (multisig.proposalNonce - 1n).toString() : "0"} to initialize
                                    </span>
                                )}
                            </div>
                            <Input
                                type="number"
                                value={proposalNonce}
                                onChange={(e) => {
                                    setProposalNonceTouched(true);
                                    setProposalNonce(e.target.value);
                                }}
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
                        {autofillHint && (
                            <p className="text-xs text-muted-foreground">{autofillHint}</p>
                        )}
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
                        <Button onClick={handleInit} disabled={loading} className="w-full">
                            <Vote className="mr-2 h-4 w-4" />
                            {loading ? "Initializing…" : "Initialize Election"}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
