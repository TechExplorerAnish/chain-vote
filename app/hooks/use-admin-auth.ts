"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { isAuthorizedAdmin } from "@/lib/admin-config";

export interface UseAdminAuthReturn {
    isAdmin: boolean;
    isAuthorized: boolean;
    connected: boolean;
    walletAddress: string | undefined;
    message: string;
}

/**
 * Hook to check if the current wallet is authorized as an admin
 * Returns authorization status and user-friendly messages
 */
export function useAdminAuth(): UseAdminAuthReturn {
    const { connected, publicKey } = useWallet();

    if (!connected || !publicKey) {
        return {
            isAdmin: false,
            isAuthorized: false,
            connected: false,
            walletAddress: undefined,
            message: "Please connect your wallet to access the admin panel.",
        };
    }

    const walletAddress = publicKey.toBase58();
    const isAuthorized = isAuthorizedAdmin(walletAddress);

    return {
        isAdmin: isAuthorized,
        isAuthorized,
        connected,
        walletAddress,
        message: isAuthorized
            ? "You are authorized as an admin."
            : "You are not authorized to access the admin panel. Please contact the system administrator.",
    };
}
