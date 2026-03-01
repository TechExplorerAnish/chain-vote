"use client";

import { ReactNode } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AdminProtectionProps {
    children: ReactNode;
}

/**
 * Component that protects admin content from unauthorized access
 * Shows an error message if the user is not an authorized admin
 */
export function AdminProtection({ children }: AdminProtectionProps) {
    const { connected, isAuthorized, message } = useAdminAuth();

    if (!connected) {
        return (
            <div className="mx-auto max-w-4xl p-6">
                <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                        Wallet Connection Required
                    </AlertTitle>
                    <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                        {message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="mx-auto max-w-4xl p-6">
                <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <AlertTitle className="text-red-800 dark:text-red-200">
                        Access Denied
                    </AlertTitle>
                    <AlertDescription className="text-red-700 dark:text-red-300">
                        {message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return <>{children}</>;
}
