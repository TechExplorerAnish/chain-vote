"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getProvider, getProgram } from "@/lib/program";
import { getElectionPda, getVoterRecordPda, getWhitelistPda } from "@/lib/pda";
import {
    computeVoteCommitment,
    generateNonce,
    generateSalt,
} from "@/lib/crypto";
import { storeCommitmentSecret } from "@/lib/commitment-store";

interface UseCommitVoteReturn {
    commitVote: (
        adminKey: PublicKey,
        candidateIndex: number
    ) => Promise<string>;
    loading: boolean;
    error: string | null;
}

/**
 * Validates that a PublicKey is a valid Solana address.
 * Prevents passing undefined, null, or improperly formatted keys.
 */
function validatePublicKey(key: PublicKey | undefined | null, name: string): PublicKey {
    if (!key) {
        throw new Error(`${name} is required and must be a valid PublicKey`);
    }
    if (!(key instanceof PublicKey)) {
        throw new Error(
            `${name} must be a PublicKey instance, received: ${typeof key}`
        );
    }
    return key;
}

/**
 * Hook for casting a commit-phase vote.
 * Generates nonce + salt, computes commitment hash, stores secrets locally,
 * then sends the on-chain commit transaction.
 *
 * PRODUCTION PATTERNS:
 * - Validates wallet connection and publicKey before transaction
 * - Validates all PublicKey parameters to prevent 'in' operator errors
 * - Stores local secrets in secure manner before on-chain submission
 * - Comprehensive error handling with user-friendly messages
 * - Proper cleanup on error and success
 */
export function useCommitVote(): UseCommitVoteReturn {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const commitVote = useCallback(
        async (adminKey: PublicKey, candidateIndex: number): Promise<string> => {
            // ============================================================
            // STEP 1: VALIDATE WALLET CONNECTION
            // ============================================================
            if (!wallet) {
                throw new Error("Wallet is not connected. Please connect your wallet first.");
            }

            if (!wallet.publicKey) {
                throw new Error(
                    "Wallet public key is unavailable. This may indicate a wallet connection issue."
                );
            }

            setLoading(true);
            setError(null);

            try {
                // ============================================================
                // STEP 2: VALIDATE INPUT PARAMETERS
                // ============================================================
                validatePublicKey(adminKey, "Admin key");
                validatePublicKey(wallet.publicKey, "Wallet public key");

                if (!Number.isInteger(candidateIndex) || candidateIndex < 0) {
                    throw new Error(
                        `Candidate index must be a non-negative integer, received: ${candidateIndex}`
                    );
                }

                // ============================================================
                // STEP 3: INITIALIZE PROVIDER AND PROGRAM
                // ============================================================
                const provider = getProvider(wallet);
                const program = getProgram(provider);

                // ============================================================
                // STEP 4: DERIVE PDA ACCOUNTS
                // ============================================================
                const [electionPda] = getElectionPda(adminKey);
                const [voterRecordPda] = getVoterRecordPda(
                    electionPda,
                    wallet.publicKey
                );
                const [whitelistPda] = getWhitelistPda(
                    electionPda,
                    wallet.publicKey
                );

                // ============================================================
                // STEP 5: GENERATE CRYPTOGRAPHIC SECRETS
                // ============================================================
                const nonce = generateNonce();
                const salt = generateSalt();

                // Compute the commitment hash (mirrors Rust logic exactly)
                const commitment = await computeVoteCommitment(
                    electionPda,
                    wallet.publicKey,
                    candidateIndex,
                    nonce,
                    salt
                );

                // ============================================================
                // STEP 6: STORE SECRETS LOCALLY (BEFORE on-chain submission)
                // Important: Do this BEFORE submitting to chain so user doesn't
                // lose ability to reveal if submission succeeds but UI crashes
                // ============================================================
                try {
                    storeCommitmentSecret(
                        electionPda,
                        wallet.publicKey,
                        nonce,
                        salt,
                        candidateIndex
                    );
                } catch (storageErr) {
                    throw new Error(
                        `Failed to store commitment secret: ${storageErr instanceof Error
                            ? storageErr.message
                            : "Unknown error"
                        }. Your vote will not be revealable.`
                    );
                }

                // ============================================================
                // STEP 7: SUBMIT ON-CHAIN TRANSACTION
                // ============================================================
                const tx = await program.methods
                    .castVote(Array.from(commitment), new BN(nonce.toString()))
                    .accounts({
                        election: electionPda,
                        voterRecord: voterRecordPda,
                        whitelistEntry: whitelistPda,
                        voter: wallet.publicKey,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const msg =
                    err instanceof Error ? err.message : "Failed to commit vote";
                setError(msg);
                console.error("Commit vote error:", err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { commitVote, loading, error };
}
