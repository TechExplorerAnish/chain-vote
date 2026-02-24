"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Badge } from "@/components/ui/badge";

export default function WalletButton() {
    const { connected, publicKey } = useWallet();

    return (
        <div className="flex items-center gap-3">
            {connected && publicKey && (
                <Badge variant="outline" className="font-mono text-xs">
                    {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
                </Badge>
            )}
            <WalletMultiButton />
        </div>
    );
}
