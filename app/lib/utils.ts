import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse error objects into readable error messages
 * Handles Anchor errors, Solana errors, and standard JavaScript errors
 */
export function parseError(err: unknown): { title: string; description: string } {
  // Handle null/undefined
  if (!err) {
    return { title: "Unknown Error", description: "An unexpected error occurred" };
  }

  // Handle string errors
  if (typeof err === "string") {
    return { title: "Error", description: err };
  }

  // Handle Error objects
  if (err instanceof Error) {
    const message = err.message;

    // Parse Anchor AnchorError
    if (message.includes("AnchorError")) {
      if (message.includes("InvalidTimeRange")) {
        return {
          title: "Invalid Time Range",
          description: "End time must be after start time.",
        };
      }
      if (message.includes("ProposalNotExecutable")) {
        return {
          title: "Proposal Not Ready",
          description: "The proposal hasn't reached the approval threshold yet. Get more admin approvals before executing.",
        };
      }
      if (message.includes("InvalidActionHash")) {
        return {
          title: "Invalid Action Hash",
          description: "The election details don't match the proposal. Ensure title, start time, and end time are identical.",
        };
      }
      if (message.includes("ProposalAlreadyApproved")) {
        return {
          title: "Already Approved",
          description: "This wallet has already approved the proposal. If your multisig threshold is higher, approve with other admin wallets.",
        };
      }
      if (message.includes("AccountNotInitialized")) {
        return {
          title: "Account Not Initialized",
          description: "The proposal account doesn't exist. You may need to use a different nonce.",
        };
      }
      if (message.includes("ProposalConsumed")) {
        return {
          title: "Proposal Already Used",
          description: "This proposal has already been consumed. Create a new proposal.",
        };
      }
      if (message.includes("InvalidNonce")) {
        return {
          title: "Invalid Proposal Nonce",
          description: "The proposal nonce is incorrect. Check the nonce value.",
        };
      }
      if (message.includes("UnauthorizedAccess")) {
        return {
          title: "Unauthorized",
          description: "Your wallet is not an authorized admin.",
        };
      }
    }

    // Parse Solana transaction errors
    if (message.includes("already in use")) {
      return {
        title: "Account Already Exists",
        description: "A proposal with this nonce already exists. Try using a different nonce number.",
      };
    }
    if (message.includes("Simulation failed")) {
      const simError = message.split("Error processing Instruction")[1];
      if (simError && simError.includes("0x0")) {
        return {
          title: "Transaction Failed",
          description: "The account may already exist. Try using a different proposal nonce.",
        };
      }
      return {
        title: "Transaction Simulation Failed",
        description: "The transaction cannot be processed. Check your inputs and wallet balance.",
      };
    }
    if (message.includes("Insufficient funds")) {
      return {
        title: "Insufficient Funds",
        description: "Your wallet doesn't have enough SOL. Please fund your wallet.",
      };
    }
    if (message.includes("not found")) {
      return {
        title: "Account Not Found",
        description: "One of the required accounts doesn't exist. Check the multisig authority address.",
      };
    }

    // Generic error message
    return {
      title: "Error",
      description: message || "An error occurred",
    };
  }

  // Handle objects with error properties
  if (typeof err === "object") {
    const errObj = err as Record<string, unknown>;

    // Check for common error properties
    if (errObj.message && typeof errObj.message === "string") {
      return parseError(new Error(errObj.message));
    }
    if (errObj.error && typeof errObj.error === "string") {
      return parseError(new Error(errObj.error));
    }

    // Fallback to string representation
    return {
      title: "Error",
      description: JSON.stringify(err).substring(0, 100),
    };
  }

  return { title: "Unknown Error", description: "An unexpected error occurred" };
}
