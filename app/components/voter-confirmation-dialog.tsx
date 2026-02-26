"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VoterConfirmationDialogProps {
    open: boolean;
    voterAddress: string;
    voterName?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    type?: "register" | "remove";
}

export function VoterConfirmationDialog({
    open,
    voterAddress,
    voterName,
    onConfirm,
    onCancel,
    isLoading = false,
    type = "register",
}: VoterConfirmationDialogProps) {
    const truncatedAddress = voterAddress.slice(0, 8) + "..." + voterAddress.slice(-8);

    const isRegister = type === "register";

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) onCancel();
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isRegister ? "Register Voter" : "Remove Voter"}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {isRegister ? (
                        <>
                            <p className="text-sm">You are about to register this voter:</p>
                            <p className="font-mono text-sm bg-muted p-2 rounded">
                                {truncatedAddress}
                            </p>
                            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-3 text-sm">
                                <strong className="text-amber-900 dark:text-amber-100">⚠️ Important:</strong>
                                <ul className="mt-2 space-y-1 text-amber-900 dark:text-amber-100">
                                    <li>• Double-check the wallet address</li>
                                    <li>• This action is recorded on-chain</li>
                                    <li>• Cannot be undone on-chain (can only be marked as invalid)</li>
                                </ul>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm">You are about to remove this voter from the active list:</p>
                            <p className="font-mono text-sm bg-muted p-2 rounded">
                                {truncatedAddress}
                            </p>
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm">
                                <strong className="text-blue-900 dark:text-blue-100">ℹ️ Note:</strong>
                                <p className="mt-2 text-blue-900 dark:text-blue-100">
                                    This marks the voter as invalid locally. The on-chain registration cannot be deleted, but it will be flagged as invalid in audit logs.
                                </p>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        variant={isRegister ? "default" : "destructive"}
                    >
                        {isLoading ? "Processing..." : (isRegister ? "Register" : "Remove")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
