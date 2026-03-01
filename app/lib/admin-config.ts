import { PublicKey } from "@solana/web3.js";

/**
 * Admin configuration - List of authorized admin wallet addresses
 * Add your admin wallet public keys here
 * Example: "HN7cABqLq46Es1jh92dQQisAq662SmxELPhJ1tKT1g3"
 */
export const AUTHORIZED_ADMINS: string[] = [
    // Add authorized admin public keys here
    // Format: "base58PublicKeyString"
];

/**
 * JUDGE/DEMO MODE - For hackathon evaluation
 * Set NEXT_PUBLIC_JUDGE_WALLET to enable a public demo wallet for judges
 * This allows any judge to access the admin panel using a shared wallet address
 * 
 * Example in .env.local or Vercel environment variables:
 * NEXT_PUBLIC_JUDGE_WALLET="HN7cABqLq46Es1jh92dQQisAq662SmxELPhJ1tKT1g3"
 */
export const JUDGE_WALLET = process.env.NEXT_PUBLIC_JUDGE_WALLET;

/**
 * JUDGE MODE PIN - Optional PIN-based access for judges
 * Set NEXT_PUBLIC_JUDGE_MODE_PIN to enable a simple PIN bypass
 * Example: NEXT_PUBLIC_JUDGE_MODE_PIN="1234"
 * Judges would enter this PIN to access admin panel
 */
export const JUDGE_MODE_PIN = process.env.NEXT_PUBLIC_JUDGE_MODE_PIN;

/**
 * Check if judge mode is enabled (for hackathon evaluation)
 */
export function isJudgeModeEnabled(): boolean {
    return JUDGE_WALLET !== undefined || JUDGE_MODE_PIN !== undefined;
}

/**
 * Check if a wallet address is authorized as an admin
 */
export function isAuthorizedAdmin(walletAddress: string | PublicKey | undefined): boolean {
    if (!walletAddress) return false;

    const addressToCheck =
        walletAddress instanceof PublicKey
            ? walletAddress.toBase58()
            : String(walletAddress);

    // Check if wallet is in authorized admins list
    if (AUTHORIZED_ADMINS.includes(addressToCheck)) {
        return true;
    }

    // Check if wallet matches judge wallet (for hackathon evaluation)
    if (JUDGE_WALLET && addressToCheck === JUDGE_WALLET) {
        return true;
    }

    return false;
}

/**
 * Get admin authorization message for error display
 */
export function getAdminAuthorizationMessage(): string {
    const messages = [
        "You are not authorized to access the admin panel.",
    ];

    if (isJudgeModeEnabled()) {
        messages.push("For judge access, please contact the organizer.");
    }

    return messages.join(" ");
}
