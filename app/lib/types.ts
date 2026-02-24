import type { PublicKey } from "@solana/web3.js";

/* ── Enums (mirror Rust repr) ─────────────────────────────── */

export enum ElectionPhase {
    Created = 0,
    RegistrationPhase = 1,
    VotingPhase = 2,
    RevealPhase = 3,
    Finalized = 4,
}

export enum GovernanceAction {
    InitializeElection = 0,
    TransitionPhase = 1,
    PublishTallyRoot = 2,
}

/* ── Account types ────────────────────────────────────────── */

export interface AdminMultisigAccount {
    admins: PublicKey[];
    adminCount: number;
    threshold: number;
    proposalNonce: bigint;
    bump: number;
}

export interface GovernanceProposalAccount {
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

export interface ElectionAccount {
    multisig: PublicKey;
    admin: PublicKey;
    title: string;
    startTime: bigint;
    endTime: bigint;
    phase: ElectionPhase;
    candidateCount: number;
    totalCommittedVotes: bigint;
    totalRevealedVotes: bigint;
    finalTallyRoot: number[];
    finalTallyRootSet: boolean;
    proofUri: string;
    isRevealed: boolean;
    revealedAt: bigint;
    finalizedAt: bigint;
    bump: number;
}

export interface CandidateAccount {
    election: PublicKey;
    name: string;
    party: string;
    index: number;
    encryptedVotes: bigint;
    revealedVotes: bigint;
    isRevealed: boolean;
    bump: number;
}

export interface VoterRecordAccount {
    election: PublicKey;
    voter: PublicKey;
    commitment: number[];
    nonce: bigint;
    hasCommitted: boolean;
    hasRevealed: boolean;
    committedAt: bigint;
    revealedAt: bigint;
    candidateIndex: number;
    bump: number;
}

export interface WhitelistEntryAccount {
    election: PublicKey;
    voter: PublicKey;
    isActive: boolean;
    bump: number;
}

/* ── Event types ──────────────────────────────────────────── */

export interface VoteCommittedEvent {
    election: PublicKey;
    voter: PublicKey;
    commitment: number[];
    nonce: bigint;
    timestamp: bigint;
}

export interface VoteRevealedEvent {
    election: PublicKey;
    voter: PublicKey;
    candidate: PublicKey;
    candidateIndex: number;
    timestamp: bigint;
}

export interface ElectionPhaseTransitionedEvent {
    election: PublicKey;
    previousPhase: ElectionPhase;
    nextPhase: ElectionPhase;
    timestamp: bigint;
}

export interface ResultsPublishedEvent {
    election: PublicKey;
    candidate: PublicKey;
    candidateIndex: number;
    candidateVotes: bigint;
    totalCandidates: number;
    phase: ElectionPhase;
    finalTallyRootSet: boolean;
    finalTallyRoot: number[];
    proofUri: string;
    publishedAt: bigint;
}

export interface FinalTallyRootCommittedEvent {
    election: PublicKey;
    tallyRoot: number[];
    proofUri: string;
    totalRevealedVotes: bigint;
    totalCommittedVotes: bigint;
}

/* ── Phase label utility ──────────────────────────────────── */

export const PHASE_LABELS: Record<ElectionPhase, string> = {
    [ElectionPhase.Created]: "Created",
    [ElectionPhase.RegistrationPhase]: "Registration",
    [ElectionPhase.VotingPhase]: "Voting",
    [ElectionPhase.RevealPhase]: "Reveal",
    [ElectionPhase.Finalized]: "Finalized",
};

export type PhaseVariant =
    | "default"
    | "secondary"
    | "destructive"
    | "outline";

export const PHASE_BADGE_VARIANT: Record<ElectionPhase, PhaseVariant> = {
    [ElectionPhase.Created]: "outline",
    [ElectionPhase.RegistrationPhase]: "secondary",
    [ElectionPhase.VotingPhase]: "default",
    [ElectionPhase.RevealPhase]: "secondary",
    [ElectionPhase.Finalized]: "outline",
};
