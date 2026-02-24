# Solana Frontend Best Practices & Error Fixes

## Issue Fixed: "Cannot use 'in' operator to search for 'option' in publicKey"

### Root Cause Analysis

This error occurs when:
1. **Anchor Account Serialization**: The `in` operator is used on Anchor-serialized objects (enums, BN, or other non-plain objects)
2. **Invalid PublicKey Objects**: Raw strings, undefined, or wallet adapter objects are passed directly to Anchor methods instead of proper `PublicKey` instances
3. **Enum Parsing**: Using the `in` operator to check discriminated union fields on objects that don't support property enumeration

**Example of the Problem:**
```typescript
// ❌ WRONG - Using 'in' operator on serialized Anchor objects
if ("created" in account.phase) { }  // account.phase might be a BN or special object

// ❌ WRONG - Passing wallet object instead of PublicKey
const tx = await program.methods.method().accounts({
    payer: wallet  // Should be wallet.publicKey
})

// ❌ WRONG - Passing string instead of PublicKey
const commitment = getVoteCommitment(adminKeyString, ...)  // Should be new PublicKey(...)
```

---

## Production-Grade Solutions

### 1. **Safe Type Conversion Utilities**

Create helper functions that safely convert Anchor objects to TypeScript types:

```typescript
/**
 * Safe conversion of Anchor BigNumber-like objects to bigint.
 * Handles BN, string, number, and { toString() } formats.
 */
function toBigInt(value: unknown): bigint {
    if (value === null || value === undefined) return 0n;
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    if (typeof value === "object" && "toString" in value) {
        try {
            return BigInt((value as { toString(): string }).toString());
        } catch {
            return 0n;
        }
    }
    return 0n;
}

/**
 * Safe PublicKey extraction from Anchor account objects.
 */
function toPublicKey(value: unknown): PublicKey {
    if (value instanceof PublicKey) return value;
    if (typeof value === "string") return new PublicKey(value);
    if (value && typeof value === "object" && "toString" in value) {
        return new PublicKey((value as { toString(): string }).toString());
    }
    throw new Error("Invalid PublicKey format");
}
```

### 2. **Safe Enum Parsing (No 'in' Operator)**

Instead of using the `in` operator, use `Object.keys()`:

```typescript
// ❌ WRONG - Can fail on non-plain objects
if ("created" in phaseObj) return ElectionPhase.Created;

// ✅ CORRECT - Works on any object
function parsePhaseFromAnchor(phaseObj: unknown): ElectionPhase {
    if (typeof phaseObj === "number") {
        if (phaseObj >= 0 && phaseObj <= 4) return phaseObj as ElectionPhase;
    }

    if (typeof phaseObj === "object" && phaseObj !== null) {
        const keys = Object.keys(phaseObj);
        if (keys.includes("created")) return ElectionPhase.Created;
        if (keys.includes("registrationPhase")) return ElectionPhase.RegistrationPhase;
        if (keys.includes("votingPhase")) return ElectionPhase.VotingPhase;
        if (keys.includes("revealPhase")) return ElectionPhase.RevealPhase;
        if (keys.includes("finalized")) return ElectionPhase.Finalized;
    }

    return ElectionPhase.Created;
}
```

### 3. **Wallet Validation Pattern**

Always validate wallet connection and publicKey before transactions:

```typescript
/**
 * Ensures wallet is connected and has a valid publicKey.
 */
function validateWalletConnection(wallet: any): {
    publicKey: PublicKey;
} {
    if (!wallet) {
        throw new Error("Wallet is not connected. Please connect your wallet first.");
    }

    if (!wallet.publicKey) {
        throw new Error(
            "Wallet public key is unavailable. This may indicate a wallet adapter issue."
        );
    }

    if (!(wallet.publicKey instanceof PublicKey)) {
        throw new Error(
            "Wallet public key is not a valid PublicKey instance."
        );
    }

    return { publicKey: wallet.publicKey };
}
```

### 4. **PublicKey Validation Pattern**

Validate all PublicKey parameters before passing to Anchor:

```typescript
/**
 * Validates that a PublicKey is a valid Solana address.
 * CRITICAL: Prevents the 'in operator' error.
 */
function validatePublicKey(
    key: PublicKey | undefined | null,
    name: string
): PublicKey {
    if (!key) {
        throw new Error(
            `${name} is required and must be a valid PublicKey instance`
        );
    }
    if (!(key instanceof PublicKey)) {
        throw new Error(
            `${name} must be a PublicKey instance, received: ${typeof key}`
        );
    }
    return key;
}

// Usage in hooks:
const commitVote = useCallback(
    async (adminKey: PublicKey, candidateIndex: number): Promise<string> => {
        // ✅ Validate before using
        validatePublicKey(adminKey, "Admin key");
        validatePublicKey(wallet.publicKey, "Wallet public key");

        // Now safe to use in Anchor methods
        const tx = await program.methods
            .castVote(commitment, nonce)
            .accounts({
                election: electionPda,
                voter: wallet.publicKey,  // ✅ Guaranteed to be PublicKey
            })
            .rpc();
    },
    [wallet]
);
```

---

## Hook Architecture Improvements

### Hook Validation Checklist

Every hook should follow this pattern:

```typescript
export function useMyHook() {
    const wallet = useAnchorWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const myAction = useCallback(
        async (param1: PublicKey, param2: string): Promise<string> => {
            // STEP 1: Validate wallet connection
            try {
                validateWalletConnection(wallet);
            } catch (err) {
                throw err;
            }

            setLoading(true);
            setError(null);

            try {
                // STEP 2: Validate all input parameters
                validatePublicKey(param1, "Param 1 name");
                if (!param2 || typeof param2 !== "string") {
                    throw new Error("Param2 must be a non-empty string");
                }

                // STEP 3: Initialize provider and program
                const provider = getProvider(wallet);
                const program = getProgram(provider);

                // STEP 4: Derive PDA accounts
                const [pdaAddress] = getPdaAddress(param1);

                // STEP 5: Build transaction
                const tx = await program.methods
                    .methodName(param2)
                    .accounts({
                        pda: pdaAddress,
                        signer: wallet.publicKey!,  // ✅ Non-null assertion safe
                    })
                    .rpc();

                return tx;
            } catch (err) {
                const msg =
                    err instanceof Error ? err.message : "Unknown error";
                setError(msg);
                console.error("Action error:", err);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [wallet]
    );

    return { myAction, loading, error };
}
```

---

## Transaction Safety Patterns

### Pre-Flight Checks

```typescript
// ✅ GOOD: Validate before submission
async function commitVote(adminKey: PublicKey, candidateIndex: number) {
    // 1. Validate inputs
    if (!wallet?.publicKey) throw new Error("No wallet");
    
    // 2. Generate secrets BEFORE on-chain submission
    const nonce = generateNonce();
    const salt = generateSalt();
    const commitment = await computeVoteCommitment(
        electionPda,
        wallet.publicKey,
        candidateIndex,
        nonce,
        salt
    );

    // 3. Store local secrets (resilience pattern)
    storeCommitmentSecret(electionPda, wallet.publicKey, nonce, salt, candidateIndex);

    // 4. Submit on-chain
    const tx = await program.methods.castVote(...).rpc();

    return tx;
}
```

### Error Recovery

```typescript
// ✅ GOOD: Only clear secrets after successful confirmation
async function revealVote(adminKey: PublicKey): Promise<string> {
    const secret = loadCommitmentSecret(electionPda, wallet.publicKey);
    if (!secret) {
        throw new Error(
            "No commitment secret found. You may have cleared your browser data."
        );
    }

    try {
        const tx = await program.methods.revealVote(...).rpc();
        
        // Only clear AFTER successful on-chain confirmation
        clearCommitmentSecret(electionPda, wallet.publicKey);
        
        return tx;
    } catch (err) {
        // DON'T clear secrets on error—user can retry
        throw err;
    }
}
```

---

## Component Integration

### Safe Component Usage

```tsx
// ✅ GOOD: Validate wallet connection in components
export function CommitForm({ adminKey, candidates }: Props) {
    const { connected } = useWallet();
    const { commitVote, loading, error } = useCommitVote();

    if (!connected) {
        return <Alert>Connect your wallet to vote.</Alert>;
    }

    const handleCommit = async () => {
        try {
            // ✅ Pass PublicKey instance, not string
            const tx = await commitVote(
                new PublicKey(adminKey),  // Convert string to PublicKey
                candidateIndex
            );
            toast.success(`Voted! Tx: ${tx.slice(0, 16)}…`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Vote failed");
        }
    };

    return (
        <Card>
            <Button onClick={handleCommit} disabled={loading || !connected}>
                Commit Vote
            </Button>
        </Card>
    );
}
```

---

## Testing Strategy

### Unit Test Pattern

```typescript
describe("useCommitVote", () => {
    it("should validate adminKey is PublicKey instance", async () => {
        const { result } = renderHook(() => useCommitVote());

        // ❌ Should throw
        await expect(
            result.current.commitVote("not-a-public-key", 0)
        ).rejects.toThrow("must be a PublicKey instance");
    });

    it("should throw if wallet not connected", async () => {
        const { result } = renderHook(() => useCommitVote(), {
            wrapper: ({ children }) => (
                <WalletProvider wallets={[]}>{children}</WalletProvider>
            ),
        });

        await expect(
            result.current.commitVote(new PublicKey("..."), 0)
        ).rejects.toThrow("Wallet is not connected");
    });
});
```

---

## Common Mistakes to Avoid

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| `const tx = await program.methods.method().accounts({ payer: wallet })` | `const tx = await program.methods.method().accounts({ payer: wallet.publicKey })` |
| `commitVote("AdminKeyString", idx)` | `commitVote(new PublicKey("AdminKeyString"), idx)` |
| `if ("created" in account.phase) { }` | `if (Object.keys(account.phase).includes("created")) { }` |
| `wallet.publicKey as PublicKey` (unsafe cast) | `validatePublicKey(wallet.publicKey, "name")` |
| `adminKey: PublicKey \| string` | `adminKey: PublicKey` (enforce type at boundary) |
| Store secrets after transaction | Store secrets **before** transaction |
| Clear secrets on any error | Clear secrets only on **success** |

---

## Deployment Checklist for Production

- [ ] All PublicKey parameters validated with `validatePublicKey()`
- [ ] All wallet connections checked with `validateWalletConnection()`
- [ ] No `in` operator used on Anchor-serialized objects
- [ ] Enum parsing uses `Object.keys()` pattern
- [ ] Local state stored BEFORE on-chain submission
- [ ] Local state cleared ONLY on success
- [ ] All error messages are user-friendly
- [ ] Console logging only in dev mode or for errors
- [ ] Timeouts set for all RPC calls
- [ ] Rate limiting for repeated operations
- [ ] All hooks have loading + error state
- [ ] Components handle disconnected wallet state
- [ ] Non-null assertions (`!`) only after validation

---

## References

- [Solana Web3.js PublicKey API](https://solana-labs.github.io/solana-web3.js/)
- [Anchor Framework Documentation](https://www.anchor-lang.com/)
- [Phantom Wallet Adapter](https://github.com/phantom/phantom-app/)
- [React Hooks Best Practices](https://react.dev/reference/react/hooks)

