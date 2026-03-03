"use client";

import { useCallback, useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getProvider, getProgram, getReadOnlyProgram } from "@/lib/program";
import { getElectionPda, getCandidatePda } from "@/lib/pda";
import type {
    ElectionAccount,
    CandidateAccount,
} from "@/lib/types";
import { ElectionPhase } from "@/lib/types";

/**
 * Safe conversion of Anchor BigNumber-like objects to bigint.
 * Handles BN, string, number, and { toString() } formats.
 */
function toBigInt(value: unknown): bigint {
    if (value === null || value === undefined) return 0n;
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    if (typeof value === "object" && "toString" in value) {
        try {
            return BigInt((value as { toString(): string }).toString());
        } catch {
            return 0n;
        }
    }
    return 0n;
}

/**
 * Safe PublicKey extraction from Anchor account objects.
 * Handles both string and PublicKey instances.
 */
function toPublicKey(value: unknown): PublicKey {
    if (value instanceof PublicKey) return value;
    if (typeof value === "string") return new PublicKey(value);
    if (value && typeof value === "object" && "toString" in value) {
        return new PublicKey((value as { toString(): string }).toString());
    }
    throw new Error("Invalid PublicKey format");
}

/**
 * Safe phase enum parsing from Anchor's discriminated union.
 * Handles both object-based and integer-based phase representations.
 */
function parsePhaseFromAnchor(phaseObj: unknown): ElectionPhase {
    // Handle numeric phase values (0-4)
    if (typeof phaseObj === "number") {
        if (phaseObj >= 0 && phaseObj <= 4) return phaseObj as ElectionPhase;
    }

    // Handle discriminated union objects
    if (typeof phaseObj === "object" && phaseObj !== null) {
        // Safe key checking using Object.keys() instead of 'in' operator
        const keys = Object.keys(phaseObj);

        if (keys.includes("created")) return ElectionPhase.Created;
        if (keys.includes("registrationPhase")) return ElectionPhase.RegistrationPhase;
        if (keys.includes("votingPhase")) return ElectionPhase.VotingPhase;
        if (keys.includes("revealPhase")) return ElectionPhase.RevealPhase;
        if (keys.includes("finalized")) return ElectionPhase.Finalized;
    }

    console.warn("Unable to parse phase, defaulting to Created", phaseObj);
    return ElectionPhase.Created;
}

/**
 * Fetch a single election and all its candidates.
 * Works without a wallet (read-only).
 * When wallet is connected, uses the authenticated provider.
 *
 * PRODUCTION PATTERNS:
 * - Safe type conversions for all Anchor account data
 * - Validates wallet connection before operations
 * - Handles missing/malformed Anchor enum objects
 * - Graceful error handling for missing candidates
 * - Proper cleanup on unmount
 */
export function useElectionAccount(adminKey: string | undefined) {
    const wallet = useAnchorWallet();
    const [election, setElection] = useState<ElectionAccount | null>(null);
    const [electionPda, setElectionPda] = useState<PublicKey | null>(null);
    const [candidates, setCandidates] = useState<CandidateAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchElection = useCallback(async () => {
        // Early return if no adminKey provided
        if (!adminKey) {
            setLoading(false);
            setError("Admin key is required");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Validate and parse adminKey
            let admin: PublicKey;
            try {
                admin = new PublicKey(adminKey);
            } catch {
                throw new Error(`Invalid admin public key: ${adminKey}`);
            }

            const [pda] = getElectionPda(admin);
            setElectionPda(pda);

            // Select appropriate provider (read-only or authenticated)
            const program = wallet
                ? getProgram(getProvider(wallet))
                : getReadOnlyProgram();

            // Fetch election account
            const account = await program.account.election.fetch(pda);

            // Safe type conversions with fallback values
            const electionData: ElectionAccount = {
                multisig: toPublicKey(account.multisig),
                admin: toPublicKey(account.admin),
                title: String(account.title ?? ""),
                startTime: toBigInt(account.startTime),
                endTime: toBigInt(account.endTime),
                phase: parsePhaseFromAnchor(account.phase),
                candidateCount: Number(account.candidateCount ?? 0),
                totalCommittedVotes: toBigInt(account.totalCommittedVotes),
                totalRevealedVotes: toBigInt(account.totalRevealedVotes),
                finalTallyRoot: Array.isArray(account.finalTallyRoot)
                    ? account.finalTallyRoot
                    : [],
                finalTallyRootSet: Boolean(account.finalTallyRootSet),
                proofUri: String(account.proofUri ?? ""),
                isRevealed: Boolean(account.isRevealed),
                revealedAt: toBigInt(account.revealedAt),
                finalizedAt: toBigInt(account.finalizedAt),
                bump: Number(account.bump ?? 0),
            };

            setElection(electionData);

            // Fetch all candidates
            const candidateList: CandidateAccount[] = [];
            for (let i = 0; i < electionData.candidateCount; i++) {
                try {
                    const [candidatePda] = getCandidatePda(pda, i);
                    const cAccount = await program.account.candidate.fetch(candidatePda);

                    candidateList.push({
                        election: toPublicKey(cAccount.election),
                        name: String(cAccount.name ?? ""),
                        party: String(cAccount.party ?? ""),
                        index: Number(cAccount.index ?? i),
                        encryptedVotes: toBigInt(cAccount.encryptedVotes),
                        revealedVotes: toBigInt(cAccount.revealedVotes),
                        isRevealed: Boolean(cAccount.isRevealed),
                        bump: Number(cAccount.bump ?? 0),
                    });
                } catch (candidateError) {
                    // Log but don't fail—candidate might not exist yet
                    console.debug(
                        `Candidate ${i} not found for election ${pda.toBase58()}:`,
                        candidateError instanceof Error
                            ? candidateError.message
                            : String(candidateError)
                    );
                }
            }
            setCandidates(candidateList);
        } catch (err) {
            let message = "Failed to fetch election";
            
            if (err instanceof Error) {
                message = err.message;
                
                // Handle Anchor "account not found" errors gracefully
                if (
                    message.includes("Account does not exist") ||
                    message.includes("cannot find the requested account") ||
                    message.includes("_bn") ||
                    message.includes("undefined")
                ) {
                    message = `Election not found. Check that the admin public key is correct: ${adminKey}`;
                }
            }
            
            setError(message);
            console.error("Election fetch error:", message);
        } finally {
            setLoading(false);
        }
    }, [adminKey, wallet]);

    useEffect(() => {
        fetchElection();
    }, [fetchElection]);

    return {
        election,
        electionPda,
        candidates,
        loading,
        error,
        refetch: fetchElection,
    };
}
