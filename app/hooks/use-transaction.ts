"use client";

import { useState } from "react";
import { toast } from "sonner";
import { retryTransaction } from "@/lib/retry";
import { parseError } from "@/lib/utils";

export type TransactionStatus = "idle" | "pending" | "retrying" | "success" | "error";

export interface UseTransactionOptions {
    onSuccess?: (result: string) => void;
    onError?: (error: Error) => void;
    maxRetries?: number;
    showToasts?: boolean;
}

export function useTransaction(options: UseTransactionOptions = {}) {
    const {
        onSuccess,
        onError,
        maxRetries = 2,
        showToasts = true,
    } = options;

    const [status, setStatus] = useState<TransactionStatus>("idle");
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const execute = async <T extends string>(
        fn: () => Promise<T>,
        label?: string
    ): Promise<T | null> => {
        setStatus("pending");
        setError(null);
        setTxSignature(null);
        setRetryCount(0);

        if (showToasts) {
            toast.loading(label || "Sending transaction...", { id: "tx-pending" });
        }

        try {
            const result = await retryTransaction(fn, {
                maxRetries,
                onRetry: (attempt, retryError) => {
                    setStatus("retrying");
                    setRetryCount(attempt);

                    if (showToasts) {
                        toast.loading(
                            `${label || "Transaction"} failed. Retrying (${attempt}/${maxRetries})...`,
                            { id: "tx-pending" }
                        );
                    }

                    console.warn(`Retry attempt ${attempt}:`, retryError.message);
                },
            });

            setStatus("success");
            setTxSignature(result);

            if (showToasts) {
                toast.dismiss("tx-pending");
                toast.success(label || "Transaction successful", {
                    description: `Signature: ${result.slice(0, 16)}...`,
                });
            }

            if (onSuccess) {
                onSuccess(result);
            }

            return result;
        } catch (err) {
            const txError = err as Error;
            setStatus("error");
            setError(txError);

            if (showToasts) {
                toast.dismiss("tx-pending");
                const { title, description } = parseError(txError);
                toast.error(title, {
                    description: retryCount > 0
                        ? `${description} (Failed after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'})`
                        : description
                });
            }

            if (onError) {
                onError(txError);
            }

            return null;
        }
    };

    const reset = () => {
        setStatus("idle");
        setError(null);
        setTxSignature(null);
        setRetryCount(0);
    };

    return {
        execute,
        status,
        txSignature,
        error,
        retryCount,
        reset,
        isLoading: status === "pending" || status === "retrying",
        isSuccess: status === "success",
        isError: status === "error",
    };
}
