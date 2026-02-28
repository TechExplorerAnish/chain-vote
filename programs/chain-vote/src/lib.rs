use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod security;
pub mod state;

use instructions::*;

declare_id!("9JHuSg8vw8JNZ8RpyugiPejCSeY77uVs9ghRTfLe57cg");

#[program]
pub mod chain_vote {
    use super::*;

    pub fn initialize_multisig(
        ctx: Context<InitializeMultisig>,
        admins: Vec<Pubkey>,
        threshold: u8,
    ) -> Result<()> {
        instructions::initialize_multisig::handler(ctx, admins, threshold)
    }

    pub fn create_governance_proposal(
        ctx: Context<CreateGovernanceProposal>,
        nonce: u64,
        action: state::GovernanceAction,
        action_hash: [u8; 32],
        expires_at: i64,
        init_election_title: String,
        init_election_start_time: i64,
        init_election_end_time: i64,
    ) -> Result<()> {
        instructions::create_governance_proposal::handler(
            ctx,
            nonce,
            action,
            action_hash,
            expires_at,
            init_election_title,
            init_election_start_time,
            init_election_end_time,
        )
    }

    pub fn approve_governance_proposal(ctx: Context<ApproveGovernanceProposal>) -> Result<()> {
        instructions::approve_governance_proposal::handler(ctx)
    }

    pub fn execute_governance_proposal(ctx: Context<ExecuteGovernanceProposal>) -> Result<()> {
        instructions::execute_governance_proposal::handler(ctx)
    }

    pub fn initialize_election(
        ctx: Context<InitializeElection>,
        proposal_nonce: u64,
        title: String,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, proposal_nonce, title, start_time, end_time)
    }

    pub fn transition_election_phase(
        ctx: Context<TransitionElectionPhase>,
        next_phase: state::ElectionPhase,
        proposal_nonce: u64,
    ) -> Result<()> {
        instructions::transition_phase::handler(ctx, next_phase, proposal_nonce)
    }

    pub fn add_candidate(
        ctx: Context<AddCandidate>,
        name: String,
        party: String,
        index: u8,
    ) -> Result<()> {
        instructions::add_candidate::handler(ctx, name, party, index)
    }

    pub fn register_voter(ctx: Context<RegisterVoter>, voter_pubkey: Pubkey) -> Result<()> {
        instructions::register_voter::handler(ctx, voter_pubkey)
    }

    pub fn cast_vote(ctx: Context<CastVote>, commitment: [u8; 32], nonce: u64) -> Result<()> {
        instructions::cast_vote::handler(ctx, commitment, nonce)
    }

    pub fn reveal_vote(
        ctx: Context<RevealVote>,
        candidate_index: u8,
        salt: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_vote::handler(ctx, candidate_index, salt)
    }

    pub fn reveal_results(ctx: Context<RevealResults>, candidate_index: u8) -> Result<()> {
        instructions::reveal_results::handler(ctx, candidate_index)
    }

    pub fn publish_tally_root(
        ctx: Context<PublishTallyRoot>,
        proposal_nonce: u64,
        tally_root: [u8; 32],
        proof_uri: String,
    ) -> Result<()> {
        instructions::publish_tally_root::handler(ctx, proposal_nonce, tally_root, proof_uri)
    }
}
