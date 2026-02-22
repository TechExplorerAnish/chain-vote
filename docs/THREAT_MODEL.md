# Chain Vote Threat Model

## Assets
- Election lifecycle integrity
- Vote privacy during voting phase
- One-wallet-one-vote guarantee
- Final tally integrity (`final_tally_root`)
- Governance authorization integrity (multisig + proposal lifecycle)

## Trust Boundaries
- On-chain program state and PDA constraints
- Off-chain indexers and proof generators
- Admin multisig key custody

## Threats and Mitigations

### 1) Replay attacks
- **Threat:** Reusing governance approvals or vote transactions.
- **Mitigation:**
  - Vote commit stores `nonce`, `has_committed`, `has_revealed`.
  - Governance uses monotonic `proposal_nonce` and one-time `proposal.consumed`.

### 2) Phase skipping / invalid transitions
- **Threat:** Jumping directly to finalization.
- **Mitigation:** Deterministic phase transitions in `transition_phase` and irreversible state updates.

### 3) Result tampering
- **Threat:** Publishing altered final results.
- **Mitigation:** On-chain `final_tally_root` + immutable event logs + proof URI anchoring.

### 4) Unauthorized administrative actions
- **Threat:** Single compromised admin key triggers sensitive actions.
- **Mitigation:** Proposal lifecycle with threshold approvals and explicit action hash matching.

### 5) Vote manipulation
- **Threat:** Changing candidate after commit.
- **Mitigation:** Reveal verifies commitment hash preimage over election + voter + candidate + nonce + salt.

## Residual Risk
- Off-chain proof generator trust remains unless prover and verifier are independently reproducible.
- Key management for multisig signers remains operational risk.
