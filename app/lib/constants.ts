import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "9JHuSg8vw8JNZ8RpyugiPejCSeY77uVs9ghRTfLe57cg"
);

export const CLUSTER_URL =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
console.log("CLUSTER_URL:", CLUSTER_URL);

export const MAX_MULTISIG_ADMINS = 5;
export const MAX_TITLE_LEN = 100;
export const MAX_PROOF_URI_LEN = 200;
export const MAX_NAME_LEN = 100;
export const MAX_PARTY_LEN = 100;
