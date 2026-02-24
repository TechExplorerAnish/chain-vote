import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { CLUSTER_URL } from "./constants";
import { IDL } from "./idl";

/* ------------------------------------------------------------------ */
/*  Untyped program handle                                            */
/*  The hand-crafted IDL doesn't produce a type that Anchor's deep    */
/*  generics can resolve, so we explicitly erase the generic and      */
/*  expose a plain `Program` whose `.methods` / `.account` accessors  */
/*  are used via `any`.                                               */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProgram = Program & { methods: any; account: any };

/**
 * Create a read-only connection (no wallet needed).
 */
export function getConnection(): Connection {
    return new Connection(CLUSTER_URL, "confirmed");
}

/**
 * Create an AnchorProvider from a connected wallet.
 */
export function getProvider(wallet: AnchorWallet): AnchorProvider {
    const connection = getConnection();
    return new AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
    });
}

/**
 * Get the Program instance.
 * Used by hooks for all on-chain reads and writes.
 */
export function getProgram(provider: AnchorProvider): AnyProgram {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program(IDL as any, provider) as unknown as AnyProgram;
}

/**
 * Read-only program instance (no wallet required).
 * Use for fetching account data without signing.
 */
export function getReadOnlyProgram(): AnyProgram {
    const connection = getConnection();
    const provider = new AnchorProvider(
        connection,
        {
            publicKey: PublicKey.default,
            signTransaction: () => Promise.reject(new Error("Read-only")),
            signAllTransactions: () => Promise.reject(new Error("Read-only")),
        },
        { preflightCommitment: "confirmed" }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Program(IDL as any, provider) as unknown as AnyProgram;
}
