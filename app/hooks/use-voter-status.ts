"use client";

import { useCallback, useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getProvider, getProgram, getReadOnlyProgram } from "@/lib/program";
import { getVoterRecordPda, getWhitelistPda, getElectionPda } from "@/lib/pda";
import type { VoterRecordAccount } from "@/lib/types";
import { hasCommitmentSecret } from "@/lib/commitment-store";

interface VoterStatus {
    isWhitelisted: boolean;
    hasCommitted: boolean;
    hasRevealed: boolean;
    hasLocalSecret: boolean;
    voterRecord: VoterRecordAccount | null;
}

/**
 * Hook to check the connected voter's status for a given election.
 */
export function useVoterStatus(adminKey: string | undefined) {
    const wallet = useAnchorWallet();
    const [status, setStatus] = useState<VoterStatus>({
        isWhitelisted: false,
        hasCommitted: false,
        hasRevealed: false,
        hasLocalSecret: false,
        voterRecord: null,
    });
    const [loading, setLoading] = useState(false);

    const fetchStatus = useCallback(async () => {
        if (!adminKey || !wallet) {
            setStatus({
                isWhitelisted: false,
                hasCommitted: false,
                hasRevealed: false,
                hasLocalSecret: false,
                voterRecord: null,
            });
            return;
        }

        setLoading(true);
        try {
            const admin = new PublicKey(adminKey);
            const [electionPda] = getElectionPda(admin);
            const program = getProgram(getProvider(wallet));

            // Check whitelist
            let whitelisted = false;
            try {
                const [whitelistPda] = getWhitelistPda(electionPda, wallet.publicKey);
                const wlEntry = await program.account.whitelistEntry.fetch(whitelistPda);
                whitelisted = wlEntry.isActive as boolean;
            } catch {
                whitelisted = false;
            }

            // Check voter record
            let record: VoterRecordAccount | null = null;
            try {
                const [vrPda] = getVoterRecordPda(electionPda, wallet.publicKey);
                const vrAccount = await program.account.voterRecord.fetch(vrPda);
                record = {
                    election: vrAccount.election as PublicKey,
                    voter: vrAccount.voter as PublicKey,
                    commitment: vrAccount.commitment as number[],
                    nonce: BigInt((vrAccount.nonce as { toString(): string }).toString()),
                    hasCommitted: vrAccount.hasCommitted as boolean,
                    hasRevealed: vrAccount.hasRevealed as boolean,
                    committedAt: BigInt((vrAccount.committedAt as { toString(): string }).toString()),
                    revealedAt: BigInt((vrAccount.revealedAt as { toString(): string }).toString()),
                    candidateIndex: vrAccount.candidateIndex as number,
                    bump: vrAccount.bump as number,
                };
            } catch {
                record = null;
            }

            const localSecret = hasCommitmentSecret(electionPda, wallet.publicKey);

            setStatus({
                isWhitelisted: whitelisted,
                hasCommitted: record?.hasCommitted ?? false,
                hasRevealed: record?.hasRevealed ?? false,
                hasLocalSecret: localSecret,
                voterRecord: record,
            });
        } catch {
            // Silently fail — status remains default
        } finally {
            setLoading(false);
        }
    }, [adminKey, wallet]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    return { ...status, loading, refetch: fetchStatus };
}
