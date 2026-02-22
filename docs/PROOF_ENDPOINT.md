# Final Tally Proof Endpoint

## Goal
Expose a verifiable endpoint for audit UI:
- On-chain `final_tally_root`
- Candidate tally leaf data
- Merkle proof path per candidate

## Recommended API

### `GET /api/elections/:electionPk/final-proof`
Returns:
```json
{
  "election": "...",
  "slot": 123,
  "blockTime": 1730000000,
  "finalTallyRoot": "0x...",
  "proofUri": "ipfs://...",
  "candidateLeaves": [
    { "index": 0, "candidate": "...", "votes": 142, "leafHash": "0x..." }
  ],
  "merkleProofs": {
    "0": ["0x...", "0x..."]
  }
}
```

## Verification Flow
1. Fetch on-chain election account.
2. Compare on-chain `final_tally_root` with endpoint `finalTallyRoot`.
3. Recompute each leaf hash and Merkle path.
4. Verify all candidate proofs produce the same root.

## Implementation Notes
- Store signed snapshots keyed by finalized slot.
- Include transaction signature that committed the root.
- Serve immutable historical proofs for each election version.
