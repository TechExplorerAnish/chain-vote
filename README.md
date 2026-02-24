# Chain Vote Protocol

Chain Vote is a Solana governance voting protocol built with Anchor. It uses a commit–reveal model, deterministic PDA account design, strict phase transitions, and multisig-governed administrative actions.

## Architecture Overview

The system is split into three layers:

1. **On-chain program (Anchor, Rust)**
   - Election lifecycle management
   - Commit–reveal voting
   - Whitelist enforcement
   - Multisig-governed critical actions
2. **Frontend (Next.js + TypeScript + `@coral-xyz/anchor`)**
   - Wallet authentication (Phantom)
   - Election participation
   - Result and audit views
3. **Optional indexer + analytics API**
   - Event ingestion from Solana logs
   - Materialized election timelines and governance actions
   - Dashboard and audit endpoint support

## Core Features

- Commit–reveal voting workflow
- Deterministic PDAs for:
  - election
  - candidate
  - voter record
  - whitelist entry
  - multisig and governance proposals
- Strict election phase machine (conceptual):
  - Initialized → Registration → Commit → Reveal → Finalized
- On-chain replay and double-vote protection:
  - `has_committed`
  - `has_revealed`
- Whitelist-based voter eligibility
- Multisig governance for:
  - election initialization
  - phase transitions
  - result/tally publication
- Transparent event emission:
  - `ElectionInitialized`
  - `CandidateRegistered`
  - `VoteCommitted`
  - `VoteRevealed`
  - `ElectionPhaseTransitioned`
  - `ResultsPublished`

## Security Model

### Commit–reveal privacy
Votes are first committed as a hash. Candidate choice is only disclosed during reveal. This reduces early vote visibility and front-running pressure.

### Replay protection
- Voter-level replay protection via `VoterRecord` flags (`has_committed`, `has_revealed`) and nonce-bound commitments.
- Governance replay protection via monotonic proposal nonce and one-time proposal consumption.

### Phase enforcement
The program enforces deterministic forward-only transitions. Invalid transitions are rejected on-chain.

### PDA constraints
All core accounts are PDA-derived with seed constraints and relationship checks (for example, candidate must belong to election).

### Multisig governance
Critical actions are gated behind multisig proposal lifecycle: create → approve → execute → consume.

## Account Structure Overview

- **Election**
  - Metadata, phase, vote counters, final commitment fields, governance bindings
- **Candidate**
  - Candidate metadata and tally counters
- **VoterRecord**
  - Commitment, nonce, commit/reveal flags, reveal outcome
- **WhitelistEntry**
  - Eligibility binding for voter + election
- **AdminMultisig**
  - Admin set, threshold, proposal nonce
- **GovernanceProposal**
  - Action intent hash, approvals, execution/consumption status

## Election Lifecycle

### 1) Initialization
Multisig-approved election creation initializes election metadata and governance linkage.

### 2) Registration
Candidates and eligible voters are registered via constrained PDAs.

### 3) Commit phase
Voters submit vote commitments (`hash(candidate, nonce, salt, election, voter)`), not plaintext choices.

### 4) Reveal phase
Voters reveal `(candidate, salt)` and the program verifies it against stored commitment before counting.

### 5) Finalization
Finalization requires committed tally root and reveal completeness checks.

## Local Development Setup

## Prerequisites

- Rust (stable)
- Solana CLI
- Anchor CLI
- Node.js (LTS) + npm or yarn

### 1. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable
```

### 2. Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
solana --version
```

### 3. Install Anchor

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
anchor --version
```

### 4. Start local validator

```bash
solana-test-validator
```

### 5. Build and deploy program

```bash
anchor build
anchor deploy
```

## Frontend Setup (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Configure environment variables (example):

```bash
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8899
NEXT_PUBLIC_PROGRAM_ID=<DEPLOYED_PROGRAM_ID>
```

## Testing

Run Rust/Anchor tests:

```bash
anchor test
```

Run TypeScript test suite:

```bash
npm test
```

## Deployment Notes

## Devnet

- Set cluster:

```bash
solana config set --url devnet
```

- Fund deployer wallet and deploy program.
- Update program ID in frontend env and IDL bindings.

## Mainnet

- Use hardware-backed key management for multisig admins.
- Lock deployment pipeline with reviewed artifacts and reproducible builds.
- Perform full audit, fuzzing, and invariant test pass before release.

## Roadmap

- Merkle-based finalized tally root generation and proof endpoint hardening
- Multisig v2 (proposal timelocks, richer signer policy, execution windows)
- Full adversarial and invariant test implementation
- zk-friendly voter eligibility proofs
- Formal verification of lifecycle and replay invariants

## License

MIT 
