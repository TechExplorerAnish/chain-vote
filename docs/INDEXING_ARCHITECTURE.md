# Event Indexing and Analytics Architecture

## Event Sources
- `VoteCommitted`
- `VoteRevealed`
- `ElectionPhaseTransitioned`
- `FinalTallyRootCommitted`
- `ResultsPublished`
- Governance proposal events

## Pipeline
1. RPC/WebSocket listener subscribes to program logs.
2. Decoder maps logs to typed event schema.
3. Postgres materialized views:
   - election_timeline
   - candidate_results
   - governance_actions
4. API layer serves explorer and dashboard endpoints.

## Dashboard Features
- Real-time phase badge and progress counters.
- Commit/reveal ratio heat map.
- Governance proposal history and signer participation.
- Final tally root verification panel.
