/**
 * IDL for the chain_vote program.
 * Prefer the generated Anchor IDL so discriminators and schema stay in sync.
 */
import rwaIDL from "../app/_idl/chain_vote.json";
let rawIdl: any;

try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    rawIdl = rwaIDL;
} catch {
    // If IDL file is not available (e.g., in production build), use an empty object
    // The program will need to fetch the IDL from the blockchain at runtime 

    rawIdl = {};
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ChainVote = any;

export const IDL: ChainVote = rawIdl;
