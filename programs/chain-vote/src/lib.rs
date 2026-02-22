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

    pub fn initialize_election(
        ctx: Context<InitializeElection>,
        title: String,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, title, start_time, end_time)
    }

    pub fn transition_election_phase(
        ctx: Context<TransitionElectionPhase>,
        next_phase: state::ElectionPhase,
    ) -> Result<()> {
        instructions::transition_phase::handler(ctx, next_phase)
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
}
