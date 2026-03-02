"use client";

import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMultisigRegistry } from "@/hooks/use-multisig-registry";
import { getMultisigPda, getProposalPda } from "@/lib/pda";
import { getReadOnlyProgram } from "@/lib/program";

import { MultisigSection } from "@/components/admin/multisig-section";
import { ElectionSection } from "@/components/admin/election-section";
import { GovernanceSection } from "@/components/admin/governance-section";
import { CandidateSection } from "@/components/admin/candidate-section";
import { VotersSection } from "@/components/admin/voters-section";
import { NotificationsSection, type PendingApprovalItem } from "@/components/admin/notifications-section";

export default function AdminPage() {
    const { connected, publicKey } = useWallet();
    const [adminKeyInput, setAdminKeyInput] = useState("");
    const [adminKeyManuallyEdited, setAdminKeyManuallyEdited] = useState(false);
    const { findMultisigsByAdmin } = useMultisigRegistry();
    const [prefetchedNotifications, setPrefetchedNotifications] = useState<PendingApprovalItem[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);

    useEffect(() => {
        if (!publicKey) return;
        setAdminKeyManuallyEdited(false);
        setAdminKeyInput(publicKey.toBase58());
    }, [publicKey]);

    // Use Pinata multisig authority to align UI for other admins in the same multisig.
    useEffect(() => {
        if (!publicKey || adminKeyManuallyEdited) return;

        let cancelled = false;

        const resolveAuthorityFromPinata = async () => {
            try {
                const walletKey = publicKey.toBase58();
                const multisigs = await findMultisigsByAdmin(walletKey);
                if (!multisigs.length) return;

                const candidates = multisigs
                    .map((ms) => ms.authority)
                    .filter((value): value is string => Boolean(value));
                if (!candidates.length) return;

                // Prefer authority that is not the currently connected wallet for collaborator admins.
                const preferredAuthority =
                    candidates.find((key) => key !== walletKey) ??
                    candidates[0];

                // Validate key format before applying.
                new PublicKey(preferredAuthority);

                if (!cancelled) {
                    setAdminKeyInput((prev) => {
                        if (prev === "" || prev === walletKey) {
                            return preferredAuthority;
                        }
                        return prev;
                    });
                }
            } catch {
                // Non-fatal fallback: admin can still input key manually.
            }
        };

        resolveAuthorityFromPinata();

        return () => {
            cancelled = true;
        };
    }, [publicKey, findMultisigsByAdmin, adminKeyManuallyEdited]);

    // Prefetch notifications in background
    const prefetchNotifications = useCallback(async () => {
        if (!publicKey) {
            setPrefetchedNotifications([]);
            return;
        }

        setNotificationsLoading(true);
        try {
            const adminWallet = publicKey.toBase58();
            const multisigs = await findMultisigsByAdmin(adminWallet);
            const program = getReadOnlyProgram();
            const pending: PendingApprovalItem[] = [];

            for (const ms of multisigs) {
                let multisigPda: PublicKey;
                try {
                    multisigPda = ms.multisigPda
                        ? new PublicKey(ms.multisigPda)
                        : getMultisigPda(new PublicKey(ms.authority))[0];
                } catch {
                    continue;
                }

                let multisigAccount: any;
                try {
                    multisigAccount = await program.account.adminMultisig.fetch(multisigPda);
                } catch {
                    continue;
                }

                const adminCount = multisigAccount.adminCount as number;
                const threshold = multisigAccount.threshold as number;
                const admins = (multisigAccount.admins as PublicKey[]).slice(0, adminCount);
                const adminIndex = admins.findIndex((a) => a.toBase58() === adminWallet);
                if (adminIndex < 0) continue;

                const proposalNonce = Number(
                    BigInt((multisigAccount.proposalNonce as { toString(): string }).toString())
                );

                const proposalFetches = Array.from({ length: proposalNonce }, (_, nonce) => {
                    const [proposalPda] = getProposalPda(multisigPda, BigInt(nonce));
                    return program.account.governanceProposal.fetch(proposalPda)
                        .then((proposal: any) => ({ proposalPda, proposal }))
                        .catch(() => null);
                });

                const proposalResults = await Promise.all(proposalFetches);
                for (const result of proposalResults) {
                    if (!result) continue;

                    const { proposalPda, proposal } = result;
                    const approvals = (proposal.approvals as boolean[]).slice(0, adminCount);
                    const alreadyApproved = Boolean(approvals[adminIndex]);
                    const executed = Boolean(proposal.executed);
                    const consumed = Boolean(proposal.consumed);

                    if (alreadyApproved || executed || consumed) continue;

                    pending.push({
                        multisigAuthority: ms.authority,
                        multisigPda,
                        threshold,
                        adminCount,
                        proposalPda,
                        nonce: BigInt((proposal.nonce as { toString(): string }).toString()),
                        proposer: proposal.proposer as PublicKey,
                        actionLabel: parseActionLabel(proposal.action),
                        approvalCount: proposal.approvalCount as number,
                        createdAt: BigInt((proposal.createdAt as { toString(): string }).toString()),
                        expiresAt: BigInt((proposal.expiresAt as { toString(): string }).toString()),
                    });
                }
            }

            pending.sort((a, b) => Number(b.createdAt - a.createdAt));
            setPrefetchedNotifications(pending);
        } catch (err) {
            setPrefetchedNotifications([]);
        } finally {
            setNotificationsLoading(false);
        }
    }, [publicKey, findMultisigsByAdmin]);

    useEffect(() => {
        prefetchNotifications();
    }, [prefetchNotifications]);

    // Keep notifications synced even when the Notifications tab is not open.
    useEffect(() => {
        const program = getReadOnlyProgram();
        const listenerHandles: number[] = [];
        let retryTimer: ReturnType<typeof setTimeout> | null = null;

        const refreshWithRetry = () => {
            prefetchNotifications();
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
                prefetchNotifications();
            }, 1200);
        };

        const setupListeners = async () => {
            try {
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalCreated", () => {
                        refreshWithRetry();
                    })
                );
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalApproved", () => {
                        refreshWithRetry();
                    })
                );
                listenerHandles.push(
                    await program.addEventListener("GovernanceProposalExecuted", () => {
                        refreshWithRetry();
                    })
                );
            } catch {
                // Non-fatal: manual refresh still works.
            }
        };

        setupListeners();

        return () => {
            if (retryTimer) clearTimeout(retryTimer);
            listenerHandles.forEach((handle) => {
                program.removeEventListener(handle);
            });
        };
    }, [prefetchNotifications]);

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
                    onChange={(e) => {
                        setAdminKeyManuallyEdited(true);
                        setAdminKeyInput(e.target.value);
                    }}
                    placeholder="Admin public key"
                    className="font-mono text-sm"
                />
            </div>

            <Tabs defaultValue="multisig">
                <TabsList className="flex-wrap">
                    <TabsTrigger value="multisig">Multisig</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="election">Election</TabsTrigger>
                    <TabsTrigger value="governance">Governance</TabsTrigger>
                    <TabsTrigger value="candidates">Candidates</TabsTrigger>
                    <TabsTrigger value="voters">Voters</TabsTrigger>
                </TabsList>

                <TabsContent value="multisig" className="mt-4">
                    <MultisigSection />
                </TabsContent>

                <TabsContent value="notifications" className="mt-4">
                    <NotificationsSection
                        prefetchedItems={prefetchedNotifications}
                        prefetchLoading={notificationsLoading}
                        onRefresh={prefetchNotifications}
                    />
                </TabsContent>

                <TabsContent value="election" className="mt-4">
                    <ElectionSection adminKey={adminKeyInput} />
                </TabsContent>

                <TabsContent value="governance" className="mt-4">
                    <GovernanceSection adminKey={adminKeyInput} onProposalChanged={prefetchNotifications} />
                </TabsContent>

                <TabsContent value="candidates" className="mt-4">
                    <CandidateSection adminKey={adminKeyInput} />
                </TabsContent>

                <TabsContent value="voters" className="mt-4">
                    <VotersSection adminKey={adminKeyInput} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function parseActionLabel(actionObj: unknown): string {
    const ACTION_LABELS: Record<number, string> = {
        0: "Initialize Election",
        1: "Transition Phase",
        2: "Publish Tally Root",
    };

    if (typeof actionObj === "number") {
        return ACTION_LABELS[actionObj] ?? "Unknown";
    }
    if (actionObj && typeof actionObj === "object") {
        if ("initializeElection" in actionObj) return "Initialize Election";
        if ("transitionPhase" in actionObj) return "Transition Phase";
        if ("publishTallyRoot" in actionObj) return "Publish Tally Root";
    }
    return "Unknown";
}
