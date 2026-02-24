import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { Buffer } from "buffer";

/**
 * Derive all PDA addresses used by the chain-vote program.
 * Seeds mirror the Rust program exactly.
 */

export function getMultisigPda(payer: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("multisig"), payer.toBuffer()],
        PROGRAM_ID
    );
}

export function getProposalPda(
    multisig: PublicKey,
    nonce: bigint | number
): [PublicKey, number] {
    const nonceBuf = Buffer.alloc(8);
    nonceBuf.writeBigUInt64LE(BigInt(nonce));
    return PublicKey.findProgramAddressSync(
        [Buffer.from("proposal"), multisig.toBuffer(), nonceBuf],
        PROGRAM_ID
    );
}

export function getElectionPda(admin: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("election"), admin.toBuffer()],
        PROGRAM_ID
    );
}

export function getCandidatePda(
    election: PublicKey,
    index: number
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("candidate"), election.toBuffer(), Buffer.from([index])],
        PROGRAM_ID
    );
}

export function getWhitelistPda(
    election: PublicKey,
    voter: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("whitelist"), election.toBuffer(), voter.toBuffer()],
        PROGRAM_ID
    );
}

export function getVoterRecordPda(
    election: PublicKey,
    voter: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("voter"), election.toBuffer(), voter.toBuffer()],
        PROGRAM_ID
    );
}
