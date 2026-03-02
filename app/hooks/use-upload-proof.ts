import { useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { uploadProofToPinata } from "@/lib/proof-utils";

interface UseUploadProofOptions {
    onSuccess?: (ipfsHash: string, proofUri: string) => void;
    onError?: (error: string) => void;
}

export function useUploadProof(options: UseUploadProofOptions = {}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const upload = useCallback(
        async (
            election: PublicKey,
            candidates: Array<{ pubkey: PublicKey; name: string; votes: number }>,
            finalTallyRoot: string,
            slot?: number,
            blockTime?: number
        ): Promise<{ ipfsHash: string; proofUri: string } | null> => {
            setLoading(true);
            setError(null);

            try {
                if (!election) {
                    throw new Error("Election public key is required");
                }
                if (!candidates || candidates.length === 0) {
                    throw new Error("At least one candidate is required");
                }
                if (!finalTallyRoot) {
                    throw new Error("Final tally root is required");
                }

                const result = await uploadProofToPinata(
                    election,
                    candidates,
                    finalTallyRoot,
                    slot,
                    blockTime
                );

                options.onSuccess?.(result.ipfsHash, result.proofUri);
                return result;
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Unknown error";
                setError(errorMsg);
                options.onError?.(errorMsg);
                console.error("[useUploadProof]", err);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [options]
    );

    return { upload, loading, error };
}
