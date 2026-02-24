/**
 * Retry a transaction with exponential backoff
 */
export async function retryTransaction<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        delayMs?: number;
        backoffMultiplier?: number;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        delayMs = 1000,
        backoffMultiplier = 2,
        onRetry,
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't retry if it's the last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Check if error is retryable
            const isRetryable = isRetryableError(lastError);
            if (!isRetryable) {
                break;
            }

            // Notify about retry
            if (onRetry) {
                onRetry(attempt + 1, lastError);
            }

            // Wait before retrying with exponential backoff
            const delay = delayMs * Math.pow(backoffMultiplier, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network-related errors
    const networkErrors = [
        "network",
        "timeout",
        "failed to fetch",
        "blockhash not found",
        "transaction was not confirmed",
        "429", // Rate limit
        "503", // Service unavailable
        "504", // Gateway timeout
    ];

    return networkErrors.some(err => message.includes(err));
}

/**
 * Execute a transaction with loading state and retry logic
 */
export async function executeWithRetry<T>(
    fn: () => Promise<T>,
    options: {
        onStart?: () => void;
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
        onRetry?: (attempt: number, error: Error) => void;
        onFinally?: () => void;
        maxRetries?: number;
    } = {}
): Promise<T | null> {
    const {
        onStart,
        onSuccess,
        onError,
        onRetry,
        onFinally,
        maxRetries = 3,
    } = options;

    try {
        if (onStart) onStart();

        const result = await retryTransaction(fn, {
            maxRetries,
            onRetry,
        });

        if (onSuccess) onSuccess(result);
        return result;
    } catch (error) {
        if (onError) onError(error as Error);
        return null;
    } finally {
        if (onFinally) onFinally();
    }
}
