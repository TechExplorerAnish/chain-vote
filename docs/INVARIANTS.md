# Formal Invariants Checklist

## Election Lifecycle
1. `Created -> RegistrationPhase -> VotingPhase -> RevealPhase -> Finalized` only.
2. `Finalized` is terminal.

## Voting
1. Each `(election, voter)` has exactly one `VoterRecord` PDA.
2. `has_committed` can transition `false -> true` once.
3. `has_revealed` can transition `false -> true` once.
4. `total_revealed_votes <= total_committed_votes` always.

## Governance
1. Proposal nonce monotonic per multisig.
2. Proposal executable only when `approval_count >= threshold` and not expired.
3. Proposal consumed exactly once when bound action is executed.

## Finalization
1. Transition to `Finalized` requires `final_tally_root_set = true`.
2. Transition to `Finalized` requires `total_revealed_votes == total_committed_votes`.

## Account Relationships
1. Candidate PDA must reference the same election key.
2. Whitelist and voter record must reference the same election + voter key.
