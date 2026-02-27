"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getConnection, getProvider, getProgram } from "@/lib/program";
import {
    getMultisigPda,
    getProposalPda,
    getElectionPda,
    getCandidatePda,
    getWhitelistPda,
} from "@/lib/pda";
import {
    hashInitializeElectionAction,
    hashTransitionPhaseAction,
    hashPublishTallyRootAction,
} from "@/lib/crypto";
import { ElectionPhase, GovernanceAction } from "@/lib/types";
import { parseError } from "@/lib/utils";

/* ── PRODUCTION UTILITIES ──────────────────────────────────── */

/**
 * Validates that a PublicKey is a valid Solana address.
 * Prevents passing undefined, null, or improperly formatted keys to Anchor.
 * CRITICAL: Prevents the 'Cannot use in operator to search for option in publicKey' error.
 */
function validatePublicKey(key: PublicKey | undefined | null, name: string): PublicKey {
    if (!key) {
        throw new Error(
            `${name} is required and must be a valid PublicKey instance`
        );
    }
    if (!(key instanceof PublicKey)) {
        throw new Error(
            `${name} must be a PublicKey instance, received: ${typeof key}`
        );
    }
    return key;
}

/**
 * Ensures wallet is connected and has a valid publicKey.
 * This prevents downstream errors when accessing wallet.publicKey.
 */
function validateWalletConnection(wallet: any): {
    publicKey: PublicKey;
} {
    if (!wallet) {
        throw new Error("Wallet is not connected. Please connect your wallet first.");
    }

    if (!wallet.publicKey) {
        throw new Error(
            "Wallet public key is unavailable. This may indicate a wallet adapter issue."
        );
    }

    if (!(wallet.publicKey instanceof PublicKey)) {
        throw new Error(
            "Wallet public key is not a valid PublicKey instance. " +
            "This indicates a wallet adapter configuration issue."
        );
    }

    return { publicKey: wallet.publicKey };
}

/* ── Multisig Initialization ─────────────────────────────── */

export function useInitializeMultisig() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialize = useCallback(
        async (admins: PublicKey[], threshold: number): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);

                // Validate admin public keys
                if (!Array.isArray(admins) || admins.length === 0) {
                    throw new Error("Admin list must be a non-empty array of PublicKeys");
                }

                admins.forEach((admin, idx) => {
                    validatePublicKey(admin, `Admin[${idx}]`);
                });

                if (!Number.isInteger(threshold) || threshold <= 0) {
                    throw new Error(
                        "Threshold must be a positive integer"
                    );
                }

                const provider = getProvider(wallet!);
                const program = getProgram(provider);
                const [multisigPda] = getMultisigPda(publicKey);

                // Prevent re-initialization if account already exists
                const connection = getConnection();
                const accountInfo = await connection.getAccountInfo(multisigPda);
                if (accountInfo) {
                    throw new Error("Multisig already initialized");
                }

                const tx = await program.methods
                    .initializeMultisig(admins, threshold)
                    .accounts({
                        multisig: multisigPda,
                        payer: publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Initialize multisig error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { initialize, loading, error };
}

/* ── Governance Proposal Lifecycle ────────────────────────── */

export function useCreateProposal() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createProposal = useCallback(
        async (
            multisigPda: PublicKey,
            nonce: bigint,
            action: GovernanceAction,
            actionHash: Uint8Array,
            expiresAt: bigint
        ): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);
                validatePublicKey(multisigPda, "Multisig PDA");

                const provider = getProvider(wallet!);
                const program = getProgram(provider);
                const [proposalPda] = getProposalPda(multisigPda, nonce);

                // Map TypeScript enum to Anchor enum format
                const actionArg = toAnchorAction(action);

                const tx = await program.methods
                    .createGovernanceProposal(
                        new BN(nonce.toString()),
                        actionArg,
                        Array.from(actionHash),
                        new BN(expiresAt.toString())
                    )
                    .accounts({
                        multisig: multisigPda,
                        proposal: proposalPda,
                        proposer: publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { title, description } = parseError(err);
                setError(description);
                console.error("Create proposal error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { createProposal, loading, error };
}

export function useApproveProposal() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const approveProposal = useCallback(
        async (multisigPda: PublicKey, proposalPda: PublicKey): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);
                validatePublicKey(multisigPda, "Multisig PDA");
                validatePublicKey(proposalPda, "Proposal PDA");

                const provider = getProvider(wallet!);
                const program = getProgram(provider);

                const tx = await program.methods
                    .approveGovernanceProposal()
                    .accounts({
                        multisig: multisigPda,
                        proposal: proposalPda,
                        approver: publicKey,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Approve proposal error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { approveProposal, loading, error };
}

export function useExecuteProposal() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const executeProposal = useCallback(
        async (multisigPda: PublicKey, proposalPda: PublicKey): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);
                validatePublicKey(multisigPda, "Multisig PDA");
                validatePublicKey(proposalPda, "Proposal PDA");

                const provider = getProvider(wallet!);
                const program = getProgram(provider);

                const tx = await program.methods
                    .executeGovernanceProposal()
                    .accounts({
                        multisig: multisigPda,
                        proposal: proposalPda,
                        executor: publicKey,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Execute proposal error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { executeProposal, loading, error };
}

/* ── Phase Transition ────────────────────────────────────── */

export function usePhaseTransition() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const transitionPhase = useCallback(
        async (
            adminKey: PublicKey,
            multisigAuthority: PublicKey,
            nextPhase: ElectionPhase,
            proposalNonce: bigint
        ): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                validateWalletConnection(wallet);
                validatePublicKey(adminKey, "Admin key");
                validatePublicKey(multisigAuthority, "Multisig authority");

                const provider = getProvider(wallet!);
                const program = getProgram(provider);

                const [electionPda] = getElectionPda(adminKey);
                const [multisigPda] = getMultisigPda(multisigAuthority);
                const [proposalPda] = getProposalPda(multisigPda, proposalNonce);

                const phaseArg = toAnchorPhase(nextPhase);

                const tx = await program.methods
                    .transitionElectionPhase(
                        phaseArg,
                        new BN(proposalNonce.toString())
                    )
                    .accounts({
                        election: electionPda,
                        multisig: multisigPda,
                        proposal: proposalPda,
                        multisigAuthority: multisigAuthority,
                        admin: adminKey,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Phase transition error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { transitionPhase, loading, error };
}

/* ── Add Candidate ───────────────────────────────────────── */

export function useAddCandidate() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addCandidate = useCallback(
        async (
            adminKey: PublicKey,
            name: string,
            party: string,
            index: number
        ): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);
                validatePublicKey(adminKey, "Admin key");

                if (!name || typeof name !== "string") {
                    throw new Error("Candidate name must be a non-empty string");
                }

                if (!party || typeof party !== "string") {
                    throw new Error("Candidate party must be a non-empty string");
                }

                if (!Number.isInteger(index) || index < 0) {
                    throw new Error("Candidate index must be a non-negative integer");
                }

                const provider = getProvider(wallet!);
                const program = getProgram(provider);

                const [electionPda] = getElectionPda(adminKey);
                const [candidatePda] = getCandidatePda(electionPda, index);

                const tx = await program.methods
                    .addCandidate(name, party, index)
                    .accounts({
                        election: electionPda,
                        candidate: candidatePda,
                        admin: publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Add candidate error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { addCandidate, loading, error };
}

/* ── Register Voter ──────────────────────────────────────── */

export function useRegisterVoter() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const registerVoter = useCallback(
        async (adminKey: PublicKey, voterPubkey: PublicKey): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);
                validatePublicKey(adminKey, "Admin key");
                validatePublicKey(voterPubkey, "Voter public key");

                const provider = getProvider(wallet!);
                const program = getProgram(provider);

                const [electionPda] = getElectionPda(adminKey);
                const [whitelistPda] = getWhitelistPda(electionPda, voterPubkey);

                const tx = await program.methods
                    .registerVoter(voterPubkey)
                    .accounts({
                        election: electionPda,
                        whitelistEntry: whitelistPda,
                        admin: publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Register voter error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { registerVoter, loading, error };
}

/* ── Initialize Election ─────────────────────────────────── */

export function useInitializeElection() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initializeElection = useCallback(
        async (
            multisigAuthority: PublicKey,
            proposalNonce: bigint,
            title: string,
            startTime: bigint,
            endTime: bigint
        ): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);
                validatePublicKey(multisigAuthority, "Multisig authority");

                if (!title || typeof title !== "string") {
                    throw new Error("Election title must be a non-empty string");
                }

                if (startTime >= endTime) {
                    throw new Error("Start time must be before end time");
                }

                const provider = getProvider(wallet!);
                const program = getProgram(provider);

                const [electionPda] = getElectionPda(publicKey);
                const [multisigPda] = getMultisigPda(multisigAuthority);
                const [proposalPda] = getProposalPda(multisigPda, proposalNonce);

                // Ensure proposal account exists before initializing election
                const connection = getConnection();
                const proposalInfo = await connection.getAccountInfo(proposalPda);
                if (!proposalInfo) {
                    throw new Error(
                        "Proposal account not found. Ensure you used the same multisig authority and proposal nonce from the created proposal."
                    );
                }

                const tx = await program.methods
                    .initializeElection(
                        new BN(proposalNonce.toString()),
                        title,
                        new BN(startTime.toString()),
                        new BN(endTime.toString())
                    )
                    .accounts({
                        election: electionPda,
                        multisig: multisigPda,
                        proposal: proposalPda,
                        multisigAuthority: multisigAuthority,
                        admin: publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Initialize election error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { initializeElection, loading, error };
}

/* ── Publish Tally Root ──────────────────────────────────── */

export function usePublishTallyRoot() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const publishTallyRoot = useCallback(
        async (
            adminKey: PublicKey,
            multisigPda: PublicKey,
            proposalNonce: bigint,
            tallyRoot: Uint8Array,
            proofUri: string
        ): Promise<string> => {
            setLoading(true);
            setError(null);
            try {
                // ============================================================
                // VALIDATE WALLET AND INPUTS
                // ============================================================
                const { publicKey } = validateWalletConnection(wallet);
                validatePublicKey(adminKey, "Admin key");
                validatePublicKey(multisigPda, "Multisig PDA");

                if (!proofUri || typeof proofUri !== "string") {
                    throw new Error("Proof URI must be a non-empty string");
                }

                const provider = getProvider(wallet!);
                const program = getProgram(provider);

                const [electionPda] = getElectionPda(adminKey);
                const [proposalPda] = getProposalPda(multisigPda, proposalNonce);

                const tx = await program.methods
                    .publishTallyRoot(
                        new BN(proposalNonce.toString()),
                        Array.from(tallyRoot),
                        proofUri
                    )
                    .accounts({
                        election: electionPda,
                        multisig: multisigPda,
                        proposal: proposalPda,
                        admin: publicKey,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const { description } = parseError(err);
                setError(description);
                console.error("Publish tally root error:", err);
                throw new Error(description);
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { publishTallyRoot, loading, error };
}

/* ── Multisig Account Fetch ──────────────────────────────── */

export function useMultisigAccount(authorityKey: string | undefined) {
    const wallet = useAnchorWallet();
    const [multisig, setMultisig] = useState<{
        admins: PublicKey[];
        adminCount: number;
        threshold: number;
        proposalNonce: bigint;
    } | null>(null);
    const [multisigPda, setMultisigPda] = useState<PublicKey | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchMultisig = useCallback(async () => {
        if (!authorityKey) return;
        setLoading(true);
        try {
            const authority = new PublicKey(authorityKey);
            const [pda] = getMultisigPda(authority);
            setMultisigPda(pda);

            const program = wallet
                ? getProgram(getProvider(wallet))
                : (() => { throw new Error("Read-only not supported here"); })();

            const account = await program.account.adminMultisig.fetch(pda);
            setMultisig({
                admins: (account.admins as PublicKey[]).slice(0, account.adminCount as number),
                adminCount: account.adminCount as number,
                threshold: account.threshold as number,
                proposalNonce: BigInt((account.proposalNonce as { toString(): string }).toString()),
            });
        } catch {
            setMultisig(null);
        } finally {
            setLoading(false);
        }
    }, [authorityKey, wallet]);

    return { multisig, multisigPda, loading, fetchMultisig };
}

/* ── Proposal Account Fetch ───────────────────────────────── */

function parseActionFromAnchor(actionObj: unknown): GovernanceAction {
    if (typeof actionObj === "number") return actionObj;
    if (actionObj && typeof actionObj === "object") {
        if ("initializeElection" in actionObj) return GovernanceAction.InitializeElection;
        if ("transitionPhase" in actionObj) return GovernanceAction.TransitionPhase;
        if ("publishTallyRoot" in actionObj) return GovernanceAction.PublishTallyRoot;
    }
    return GovernanceAction.InitializeElection;
}

export interface ProposalAccountData {
    multisig: PublicKey;
    proposer: PublicKey;
    action: GovernanceAction;
    actionHash: number[];
    nonce: bigint;
    approvals: boolean[];
    approvalCount: number;
    executed: boolean;
    consumed: boolean;
    createdAt: bigint;
    expiresAt: bigint;
    bump: number;
}

export function useProposalAccount(
    authorityKey: string | undefined,
    nonce: string | undefined
) {
    const wallet = useAnchorWallet();
    const [proposal, setProposal] = useState<ProposalAccountData | null>(null);
    const [proposalPda, setProposalPda] = useState<PublicKey | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProposal = useCallback(async () => {
        if (!authorityKey || nonce === undefined || nonce === "") {
            setProposal(null);
            setProposalPda(null);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const authority = new PublicKey(authorityKey);
            const [multisigPda] = getMultisigPda(authority);
            const nonceBigInt = BigInt(nonce);
            const [pda] = getProposalPda(multisigPda, nonceBigInt);
            setProposalPda(pda);

            const program = wallet
                ? getProgram(getProvider(wallet))
                : (() => { throw new Error("Wallet required"); })();

            const account = await program.account.governanceProposal.fetch(pda);

            const adminCount = (account.approvals as boolean[]).length;
            setProposal({
                multisig: account.multisig as PublicKey,
                proposer: account.proposer as PublicKey,
                action: parseActionFromAnchor(account.action),
                actionHash: account.actionHash as number[],
                nonce: BigInt((account.nonce as { toString(): string }).toString()),
                approvals: (account.approvals as boolean[]).slice(0, adminCount),
                approvalCount: account.approvalCount as number,
                executed: account.executed as boolean,
                consumed: account.consumed as boolean,
                createdAt: BigInt((account.createdAt as { toString(): string }).toString()),
                expiresAt: BigInt((account.expiresAt as { toString(): string }).toString()),
                bump: account.bump as number,
            });
        } catch {
            setProposal(null);
            setError("Proposal not found on-chain");
        } finally {
            setLoading(false);
        }
    }, [authorityKey, nonce, wallet]);

    return { proposal, proposalPda, loading, error, fetchProposal };
}

/* ── Helpers ─────────────────────────────────────────────── */

// Convert TS GovernanceAction → Anchor enum object
function toAnchorAction(action: GovernanceAction): Record<string, object> {
    switch (action) {
        case GovernanceAction.InitializeElection:
            return { initializeElection: {} };
        case GovernanceAction.TransitionPhase:
            return { transitionPhase: {} };
        case GovernanceAction.PublishTallyRoot:
            return { publishTallyRoot: {} };
    }
}

// Convert TS ElectionPhase → Anchor enum object
function toAnchorPhase(phase: ElectionPhase): Record<string, object> {
    switch (phase) {
        case ElectionPhase.Created:
            return { created: {} };
        case ElectionPhase.RegistrationPhase:
            return { registrationPhase: {} };
        case ElectionPhase.VotingPhase:
            return { votingPhase: {} };
        case ElectionPhase.RevealPhase:
            return { revealPhase: {} };
        case ElectionPhase.Finalized:
            return { finalized: {} };
    }
}

/* ── Re-export crypto helpers for admin use ──────────────── */
export {
    hashInitializeElectionAction,
    hashTransitionPhaseAction,
    hashPublishTallyRootAction,
};
