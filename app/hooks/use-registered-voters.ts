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

                // electionPda could be either the admin key or the election PDA itself
                // Try to derive the election PDA from the admin key
                let electionKey: PublicKey;
                try {
                    const adminKey = new PublicKey(electionPda);
                    const [derivedElectionPda] = getElectionPda(adminKey);
                    electionKey = derivedElectionPda;
                    console.log("Derived election PDA from admin key:", electionKey.toBase58());
                } catch {
                    // If derivation fails, treat electionPda as the election PDA directly
                    electionKey = new PublicKey(electionPda);
                    console.log("Using provided election PDA:", electionKey.toBase58());
                }

                // Fetch all whitelist entries for this election
                const allWhitelistAccounts = await program.account.whitelistEntry.all();
                console.log("Total whitelist entries in program:", allWhitelistAccounts.length);

                // Filter manually to match the election
                const whitelistAccounts = allWhitelistAccounts.filter((wl: any) => {
                    const whitelistData = wl.account as WhitelistEntryAccount;
                    return whitelistData.election.toBase58() === electionKey.toBase58();
                });

                console.log("Whitelist entries for this election:", whitelistAccounts.length);

                // Fetch all voter records for this election
                const allVoterRecordAccounts = await program.account.voterRecord.all();
                console.log("Total voter records in program:", allVoterRecordAccounts.length);

                const voterRecordAccounts = allVoterRecordAccounts.filter((vr: any) => {
                    const voterRecordData = vr.account as VoterRecordAccount;
                    return voterRecordData.election.toBase58() === electionKey.toBase58();
                });

                console.log("Voter records for this election:", voterRecordAccounts.length);

                const voterRecordByVoter = new Map<string, VoterRecordAccount>();
                for (const vr of voterRecordAccounts) {
                    const record = vr.account as VoterRecordAccount;
                    voterRecordByVoter.set(record.voter.toBase58(), record);
                }

                // For each whitelist entry, try to fetch their voter record
                const votersData = await Promise.all(
                    whitelistAccounts.map(async (wl: any) => {
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
                    })
                );

                console.log("Final voters data:", votersData);
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
