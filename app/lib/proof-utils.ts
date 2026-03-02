import { PublicKey } from "@solana/web3.js";

/**
 * Candidate leaf in Merkle tree proof
 */
export interface CandidateLeaf {
    index: number;
    candidate: string; // PublicKey or name
    votes: number;
    leafHash: string; // hex
}

/**
 * Generate candidate leaves from election data
 * For now, assumes votes are already tallied
 */
export function generateCandidateLeaves(
    candidates: Array<{ pubkey: PublicKey; name: string; votes: number }>
): CandidateLeaf[] {
    return candidates.map((c, idx) => ({
        index: idx,
        candidate: c.pubkey.toString(),
        votes: c.votes,
        leafHash: computeCandidateLeafHash(idx, c.pubkey, c.votes),
    }));
}

/**
 * Simple leaf hash: SHA256(index || candidate || votes)
 * In production, use the actual Merkle leaf hash
 */
export function computeCandidateLeafHash(
    index: number,
    candidate: PublicKey,
    votes: number
): string {
    // Placeholder: concat index + candidate + votes
    // Replace with actual hash when computing real Merkle tree
    const combined = `${index}:${candidate.toString()}:${votes}`;
    return hashString(combined);
}

/**
 * Simple hash function for demo (replace with crypto.subtle.digest in production)
 */
export function hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, "0").slice(0, 64);
}

/**
 * Generate placeholder Merkle proofs for each candidate
 * In production, compute actual Merkle paths to root
 */
export function generateMerkleProofs(
    leaves: CandidateLeaf[]
): Record<string, string[]> {
    const proofs: Record<string, string[]> = {};

    leaves.forEach((leaf) => {
        // Placeholder: just create some dummy proof paths
        proofs[leaf.index.toString()] = [
            "0x" + "a".repeat(64),
            "0x" + "b".repeat(64),
            "0x" + "c".repeat(64),
        ];
    });

    return proofs;
}

/**
 * Upload proof data to /api/proof
 * Returns IPFS hash and proofUri
 */
export async function uploadProofToPinata(
    election: PublicKey,
    candidates: Array<{ pubkey: PublicKey; name: string; votes: number }>,
    finalTallyRoot: string,
    slot?: number,
    blockTime?: number
): Promise<{ ipfsHash: string; proofUri: string }> {
    const leaves = generateCandidateLeaves(candidates);
    const proofs = generateMerkleProofs(leaves);

    const response = await fetch("/api/proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            election: election.toString(),
            candidateLeaves: leaves,
            merkleProofs: proofs,
            finalTallyRoot,
            slot,
            blockTime,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload proof");
    }

    const data = await response.json();
    return {
        ipfsHash: data.ipfsHash,
        proofUri: data.proofUri,
    };
}

/**
 * Fetch and verify proof from IPFS
 */
export async function fetchProofFromIPFS(hash: string): Promise<any> {
    const response = await fetch(`/api/proof?hash=${encodeURIComponent(hash)}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch proof: ${response.statusText}`);
    }
    return response.json();
}
