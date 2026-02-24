"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getProvider, getProgram } from "@/lib/program";
import {
    getElectionPda,
    getCandidatePda,
    getVoterRecordPda,
    getWhitelistPda,
} from "@/lib/pda";
import {
    loadCommitmentSecret,
    clearCommitmentSecret,
} from "@/lib/commitment-store";

interface UseRevealVoteReturn {
    revealVote: (adminKey: PublicKey) => Promise<string>;
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
 * Hook for the reveal phase.
 * Retrieves the locally-stored nonce + salt, sends the reveal transaction.
 *
 * PRODUCTION PATTERNS:
 * - Validates wallet connection and publicKey before transaction
 * - Validates all PublicKey parameters to prevent 'in' operator errors
 * - Retrieves and validates local commitment secrets
 * - Clears secrets only after successful on-chain confirmation
 * - Comprehensive error handling with user-friendly messages
 */
export function useRevealVote(): UseRevealVoteReturn {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const revealVote = useCallback(
        async (adminKey: PublicKey): Promise<string> => {
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

                // ============================================================
                // STEP 3: INITIALIZE PROVIDER AND PROGRAM
                // ============================================================
                const provider = getProvider(wallet);
                const program = getProgram(provider);

                // ============================================================
                // STEP 4: DERIVE ELECTION PDA
                // ============================================================
                const [electionPda] = getElectionPda(adminKey);

                // ============================================================
                // STEP 5: RETRIEVE AND VALIDATE LOCAL COMMITMENT SECRET
                // ============================================================
                const secret = loadCommitmentSecret(electionPda, wallet.publicKey);
                if (!secret) {
                    throw new Error(
                        "No commitment secret found in local storage. " +
                        "You must have committed a vote before revealing. " +
                        "If you cleared browser data, your vote cannot be revealed."
                    );
                }

                const { candidateIndex, salt } = secret;

                // ============================================================
                // STEP 6: DERIVE REMAINING ACCOUNT PDAS
                // ============================================================
                const [candidatePda] = getCandidatePda(electionPda, candidateIndex);
                const [voterRecordPda] = getVoterRecordPda(
                    electionPda,
                    wallet.publicKey
                );
                const [whitelistPda] = getWhitelistPda(
                    electionPda,
                    wallet.publicKey
                );

                // ============================================================
                // STEP 7: SUBMIT REVEAL TRANSACTION
                // ============================================================
                const tx = await program.methods
                    .revealVote(candidateIndex, Array.from(salt))
                    .accounts({
                        election: electionPda,
                        candidate: candidatePda,
                        voterRecord: voterRecordPda,
                        whitelistEntry: whitelistPda,
                        voter: wallet.publicKey,
                    })
                    .rpc();

                // ============================================================
                // STEP 8: CLEAR SECRETS AFTER SUCCESSFUL REVEAL
                // Only clear after successful on-chain confirmation
                // ============================================================
                try {
                    clearCommitmentSecret(electionPda, wallet.publicKey);
                } catch (clearErr) {
                    console.warn(
                        "Failed to clear local secret after successful reveal:",
                        clearErr
                    );
                    // Don't fail the entire operation if cleanup fails
                }

                return tx;
            } catch (err) {
                const msg =
                    err instanceof Error ? err.message : "Failed to reveal vote";
                setError(msg);
                console.error("Reveal vote error:", err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { revealVote, loading, error };
}
