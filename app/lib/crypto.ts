import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import { ElectionPhase } from "./types";

/**
 * Mirrors the Rust SHA256 commitment and governance action hash functions.
 * Uses the Web Crypto API (SubtleCrypto) — works in browser and Next.js.
 */

async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const digest = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
    return new Uint8Array(digest);
}

function concatBuffers(...bufs: Uint8Array[]): Uint8Array {
    const total = bufs.reduce((sum, b) => sum + b.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const b of bufs) {
        out.set(b, offset);
        offset += b.length;
    }
    return out;
}

function i64ToLeBytes(n: bigint): Uint8Array {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(n);
    return new Uint8Array(buf);
}

/* ── Vote commitment ──────────────────────────────────────── */

/**
 * Compute the vote commitment hash matching the on-chain verify:
 * SHA256("vote-commitment-v1" || election || voter || [candidate_index] || nonce_le || salt)
 */
export async function computeVoteCommitment(
    election: PublicKey,
    voter: PublicKey,
    candidateIndex: number,
    nonce: bigint,
    salt: Uint8Array
): Promise<Uint8Array> {
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(nonce);

    const payload = concatBuffers(
        new TextEncoder().encode("vote-commitment-v1"),
        election.toBuffer(),
        voter.toBuffer(),
        new Uint8Array([candidateIndex]),
        new Uint8Array(nonceBuf),
        salt
    );
    return sha256(payload);
}

/**
 * Generate a random 32-byte salt for vote commitment.
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Generate a random nonce (> 0) for vote commitment.
 */
export function generateNonce(): bigint {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const buf = Buffer.from(bytes);
    let n = buf.readBigUInt64LE();
    if (n === 0n) n = 1n;
    return n;
}

/* ── Governance action hashes ─────────────────────────────── */

/**
 * SHA256("governance-action-v1" || "initialize-election" || admin || title || start_le || end_le)
 */
export async function hashInitializeElectionAction(
    admin: PublicKey,
    title: string,
    startTime: bigint,
    endTime: bigint
): Promise<Uint8Array> {
    const payload = concatBuffers(
        new TextEncoder().encode("governance-action-v1"),
        new TextEncoder().encode("initialize-election"),
        admin.toBuffer(),
        new TextEncoder().encode(title),
        i64ToLeBytes(startTime),
        i64ToLeBytes(endTime)
    );
    return sha256(payload);
}

/**
 * SHA256("governance-action-v1" || "transition-phase" || election || [next_phase])
 */
export async function hashTransitionPhaseAction(
    election: PublicKey,
    nextPhase: ElectionPhase
): Promise<Uint8Array> {
    const payload = concatBuffers(
        new TextEncoder().encode("governance-action-v1"),
        new TextEncoder().encode("transition-phase"),
        election.toBuffer(),
        new Uint8Array([nextPhase])
    );
    return sha256(payload);
}

/**
 * SHA256("governance-action-v1" || "publish-tally-root" || election || tally_root || proof_uri)
 */
export async function hashPublishTallyRootAction(
    election: PublicKey,
    tallyRoot: Uint8Array,
    proofUri: string
): Promise<Uint8Array> {
    const payload = concatBuffers(
        new TextEncoder().encode("governance-action-v1"),
        new TextEncoder().encode("publish-tally-root"),
        election.toBuffer(),
        tallyRoot,
        new TextEncoder().encode(proofUri)
    );
    return sha256(payload);
}
