import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { getReadOnlyProgram } from "@/lib/program";
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
                const electionKey = new PublicKey(electionPda);

                // Fetch all whitelist entries for this election
                const whitelistAccounts = await program.account.whitelistEntry.all([
                    {
                        memcmp: {
                            offset: 8, // After discriminator (8 bytes)
                            bytes: electionKey.toBuffer().toString("base64"),
                        },
                    },
                ]);

                // For each whitelist entry, try to fetch their voter record
                const votersData = await Promise.all(
                    whitelistAccounts.map(async (wl: any) => {
                        const whitelistData = wl.account as WhitelistEntryAccount;
                        const voterAddress = whitelistData.voter.toBase58();

                        // Try to fetch voter record
                        let voterRecord: VoterRecordAccount | null = null;
                        try {
                            const voterRecordAccounts = await program.account.voterRecord.all([
                                {
                                    memcmp: {
                                        offset: 8,
                                        bytes: electionKey.toBase58(),
                                    },
                                },
                                {
                                    memcmp: {
                                        offset: 8 + 32, // After discriminator + election pubkey
                                        bytes: whitelistData.voter.toBase58(),
                                    },
                                },
                            ]);

                            if (voterRecordAccounts.length > 0) {
                                voterRecord = voterRecordAccounts[0].account as VoterRecordAccount;
                            }
                        } catch (err) {
                            // Voter hasn't voted yet, that's okay
                        }

                        return {
                            voterAddress,
                            isActive: whitelistData.isActive,
                            hasCommitted: voterRecord?.hasCommitted || false,
                            hasRevealed: voterRecord?.hasRevealed || false,
                            committedAt: voterRecord?.committedAt,
                            revealedAt: voterRecord?.revealedAt,
                        };
                    })
                );

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
