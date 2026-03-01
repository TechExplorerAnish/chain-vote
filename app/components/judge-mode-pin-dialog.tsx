"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { JUDGE_MODE_PIN } from "@/lib/admin-config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Lock } from "lucide-react";

interface JudgeModePinProps {
    onSuccess: () => void;
}

/**
 * Component that provides PIN-based access for judges
 * Only rendered if JUDGE_MODE_PIN environment variable is set
 */
export function JudgeModePinDialog({ onSuccess }: JudgeModePinProps) {
    const { connected } = useWallet();
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (!pin) {
                setError("Please enter the PIN");
                return;
            }

            if (pin !== JUDGE_MODE_PIN) {
                setError("Incorrect PIN. Please try again.");
                return;
            }

            // PIN is correct - unlock admin panel
            onSuccess();
        } finally {
            setLoading(false);
        }
    };

    if (!connected || !JUDGE_MODE_PIN) {
        return null;
    }

    return (
        <div className="mx-auto max-w-md p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Judge Access
                    </CardTitle>
                    <CardDescription>
                        Enter the PIN to access the admin panel for evaluation
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pin">Access PIN</Label>
                            <Input
                                id="pin"
                                type="password"
                                placeholder="Enter PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                disabled={loading}
                                className="text-center text-lg tracking-widest"
                            />
                        </div>

                        {error && (
                            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                <AlertTitle className="text-red-800 dark:text-red-200">
                                    Error
                                </AlertTitle>
                                <AlertDescription className="text-red-700 dark:text-red-300">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || !pin}
                            className="w-full"
                        >
                            {loading ? "Verifying..." : "Unlock Admin Panel"}
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                            This PIN is for authorized judges only
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
