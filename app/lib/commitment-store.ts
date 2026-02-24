/**
 * Local storage for vote commitment secrets (nonce + salt).
 * Namespaced by election + voter to prevent collisions.
 *
 * This data is critical — if lost, the voter cannot reveal their vote.
 */

import { PublicKey } from "@solana/web3.js";

interface CommitmentSecret {
    nonce: string; // bigint serialized as string
    salt: string; // hex-encoded 32 bytes
    candidateIndex: number;
    committedAt: number; // unix ms
}

function storageKey(election: PublicKey, voter: PublicKey): string {
    return `chain-vote:commitment:${election.toBase58()}:${voter.toBase58()}`;
}

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

export function storeCommitmentSecret(
    election: PublicKey,
    voter: PublicKey,
    nonce: bigint,
    salt: Uint8Array,
    candidateIndex: number
): void {
    const key = storageKey(election, voter);
    const data: CommitmentSecret = {
        nonce: nonce.toString(),
        salt: toHex(salt),
        candidateIndex,
        committedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
}

export function loadCommitmentSecret(
    election: PublicKey,
    voter: PublicKey
): { nonce: bigint; salt: Uint8Array; candidateIndex: number } | null {
    const key = storageKey(election, voter);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
        const data: CommitmentSecret = JSON.parse(raw);
        return {
            nonce: BigInt(data.nonce),
            salt: fromHex(data.salt),
            candidateIndex: data.candidateIndex,
        };
    } catch {
        return null;
    }
}

export function clearCommitmentSecret(
    election: PublicKey,
    voter: PublicKey
): void {
    const key = storageKey(election, voter);
    localStorage.removeItem(key);
}

export function hasCommitmentSecret(
    election: PublicKey,
    voter: PublicKey
): boolean {
    const key = storageKey(election, voter);
    return localStorage.getItem(key) !== null;
}
