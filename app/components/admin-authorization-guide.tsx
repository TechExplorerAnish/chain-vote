"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Users } from "lucide-react";

/**
 * Component showing instructions for managing admin authorization
 * This guide helps developers understand how to add/remove authorized admins
 */
export function AdminAuthorizationGuide() {
    return (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Users className="h-5 w-5" />
                    Admin Authorization Guide
                </CardTitle>
                <CardDescription className="text-blue-800 dark:text-blue-200">
                    How to manage authorized admin access
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
                <div>
                    <h3 className="mb-2 font-semibold">To add an authorized admin:</h3>
                    <ol className="mb-4 list-inside list-decimal space-y-1">
                        <li>Get the admin's Solana wallet public key</li>
                        <li>Open <code className="rounded bg-blue-100 px-2 py-1 dark:bg-blue-900">app/lib/admin-config.ts</code></li>
                        <li>Add the public key to the <code className="rounded bg-blue-100 px-2 py-1 dark:bg-blue-900">AUTHORIZED_ADMINS</code> array</li>
                        <li>Redeploy the application</li>
                    </ol>
                </div>
                <div>
                    <h3 className="mb-2 font-semibold">Example configuration:</h3>
                    <pre className="overflow-x-auto rounded bg-blue-100 p-2 text-xs dark:bg-blue-900">
{`export const AUTHORIZED_ADMINS: string[] = [
    "HN7cABqLq46Es1jh92dQQisAq662SmxELPhJ1tKT1g3",
    "GJwrZyB7rnWV8FX3xqLnT1Xj7WqYH8kPGkZ5v3P9n4Aq",
];`}
                    </pre>
                </div>
                <Alert className="border-blue-300 bg-blue-100 dark:border-blue-800 dark:bg-blue-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Security Note</AlertTitle>
                    <AlertDescription>
                        Only authorized admins can access this panel. Add wallet addresses of trusted administrators only.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}
