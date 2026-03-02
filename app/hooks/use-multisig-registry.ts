import { useState, useCallback } from "react";

interface MultisigMetadata {
    authority: string;
    multisigPda: string;
    admins: string[];
    threshold: number;
    createdAt: number;
}

export function useMultisigRegistry() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const registerMultisig = useCallback(
        async (
            authority: string,
            multisigPda: string,
            admins: string[],
            threshold: number
        ) => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch("/api/multisig-registry", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        authority,
                        multisigPda,
                        admins,
                        threshold,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to register multisig");
                }

                return data;
            } catch (err: any) {
                setError(err.message);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const findMultisigByAdmin = useCallback(
        async (adminWallet: string): Promise<MultisigMetadata | null> => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/multisig-registry?admin=${encodeURIComponent(adminWallet)}`
                );

                if (response.status === 404) {
                    return null; // No multisig found
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to find multisig");
                }

                return data.multisig;
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const findMultisigsByAdmin = useCallback(
        async (adminWallet: string): Promise<MultisigMetadata[]> => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/multisig-registry?admin=${encodeURIComponent(adminWallet)}`
                );

                if (response.status === 404) {
                    return [];
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Failed to find multisigs");
                }

                return Array.isArray(data.allMultisigs) ? data.allMultisigs : [];
            } catch (err: any) {
                setError(err.message);
                return [];
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return {
        registerMultisig,
        findMultisigByAdmin,
        findMultisigsByAdmin,
        loading,
        error,
    };
}
