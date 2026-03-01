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
 * Check if a wallet address is authorized as an admin
 */
export function isAuthorizedAdmin(walletAddress: string | PublicKey | undefined): boolean {
    if (!walletAddress) return false;

    const addressToCheck =
        walletAddress instanceof PublicKey
            ? walletAddress.toBase58()
            : String(walletAddress);

    return AUTHORIZED_ADMINS.includes(addressToCheck);
}

/**
 * Get admin authorization message for error display
 */
export function getAdminAuthorizationMessage(): string {
    return "You are not authorized to access the admin panel. Please contact the system administrator.";
}
