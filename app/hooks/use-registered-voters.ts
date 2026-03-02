import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { getReadOnlyProgram } from "@/lib/program";
import { getElectionPda } from "@/lib/pda";
import type { WhitelistEntryAccount, VoterRecordAccount } from "@/lib/types";

export interface RegisteredVoter {
    voterAddress: string;
    isActive: boolean;
    hasCommitted: boolean;
    hasRevealed: boolean;
    committedAt?: bigint;
    revealedAt?: bigint;
}

export function useRegisteredVoters(electionPda: string | undefined, externalTrigger?: number) {
    const [voters, setVoters] = useState<RegisteredVoter[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    useEffect(() => {
        if (!electionPda) return;

        const fetchVoters = async () => {
            setLoading(true);
            setError(null);
            try {
                const program = getReadOnlyProgram();
                const inputKey = new PublicKey(electionPda);

                // Fetch all whitelist entries once
                const allWhitelistAccounts = await program.account.whitelistEntry.all();

                // Try to find matching voters using the input key directly
                let whitelistAccounts = allWhitelistAccounts.filter((wl: any) => {
                    const whitelistData = wl.account as WhitelistEntryAccount;
                    return whitelistData.election.toBase58() === inputKey.toBase58();
                });

                // If no matches, try deriving from input as admin key
                if (whitelistAccounts.length === 0) {
                    const [derivedPda] = getElectionPda(inputKey);

                    whitelistAccounts = allWhitelistAccounts.filter((wl: any) => {
                        const whitelistData = wl.account as WhitelistEntryAccount;
                        return whitelistData.election.toBase58() === derivedPda.toBase58();
                    });
                }

                // Determine which key we're using
                const electionKey = whitelistAccounts.length > 0
                    ? new PublicKey(whitelistAccounts[0].account.election)
                    : inputKey;

                // Fetch all voter records for this election
                const allVoterRecordAccounts = await program.account.voterRecord.all();
                const voterRecordAccounts = allVoterRecordAccounts.filter((vr: any) => {
                    const voterRecordData = vr.account as VoterRecordAccount;
                    return voterRecordData.election.toBase58() === electionKey.toBase58();
                });

                const voterRecordByVoter = new Map<string, VoterRecordAccount>();
                for (const vr of voterRecordAccounts) {
                    const record = vr.account as VoterRecordAccount;
                    voterRecordByVoter.set(record.voter.toBase58(), record);
                }

                // For each whitelist entry, build the voter data
                const votersData = whitelistAccounts.map((wl: any) => {
                    const whitelistData = wl.account as WhitelistEntryAccount;
                    const voterAddress = whitelistData.voter.toBase58();
                    const voterRecord = voterRecordByVoter.get(voterAddress) ?? null;

                    return {
                        voterAddress,
                        isActive: whitelistData.isActive,
                        hasCommitted: voterRecord?.hasCommitted || false,
                        hasRevealed: voterRecord?.hasRevealed || false,
                        committedAt: voterRecord?.committedAt,
                        revealedAt: voterRecord?.revealedAt,
                    };
                });

                setVoters(votersData);
            } catch (err) {
                console.error("Error fetching registered voters:", err);
                setError("Failed to fetch registered voters");
            } finally {
                setLoading(false);
            }
        };

        fetchVoters();
    }, [electionPda, refetchTrigger, externalTrigger]);

    const voterCount = voters.length;
    const committedCount = voters.filter((v) => v.hasCommitted).length;
    const revealedCount = voters.filter((v) => v.hasRevealed).length;

    return {
        voters,
        voterCount,
        committedCount,
        revealedCount,
        loading,
        error,
        refetch: () => {
            setRefetchTrigger(prev => prev + 1);
        },
    };
}
