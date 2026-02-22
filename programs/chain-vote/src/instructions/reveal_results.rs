use crate::errors::VotingError;
use crate::security::verify_multisig_signers;
use crate::state::{AdminMultisig, Candidate, Election, ElectionPhase};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(candidate_index: u8)]
pub struct RevealResults<'info> {
    #[account(
        seeds = [b"election", admin.key().as_ref()],
        bump = election.bump,
        has_one = admin @ VotingError::UnauthorizedAccess,
        has_one = multisig @ VotingError::InvalidElectionState,
    )]
    pub election: Account<'info, Election>,

    #[account(
        seeds = [b"candidate", election.key().as_ref(), &[candidate_index]],
        bump = candidate.bump,
        constraint = candidate.election == election.key() @ VotingError::InvalidElectionState,
        constraint = candidate.index == candidate_index @ VotingError::CandidateNotFound,
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(
        seeds = [b"multisig", multisig_authority.key().as_ref()],
        bump = multisig.bump,
    )]
    pub multisig: Account<'info, AdminMultisig>,

    pub multisig_authority: Signer<'info>,

    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<RevealResults>, candidate_index: u8) -> Result<()> {
    let mut co_signer_keys = vec![ctx.accounts.multisig_authority.key()];
    co_signer_keys.extend(
        ctx.remaining_accounts
            .iter()
            .filter(|acc| acc.is_signer)
            .map(|acc| acc.key()),
    );

    verify_multisig_signers(
        &ctx.accounts.multisig,
        &ctx.accounts.admin.key(),
        &co_signer_keys,
    )?;

    let election = &ctx.accounts.election;
    let now = Clock::get()?.unix_timestamp;

    require!(
        election.phase == ElectionPhase::RevealPhase || election.phase == ElectionPhase::Finalized,
        VotingError::InvalidElectionState
    );

    let candidate = &ctx.accounts.candidate;

    emit!(ResultsPublished {
        election: election.key(),
        candidate: candidate.key(),
        candidate_index,
        candidate_votes: candidate.revealed_votes,
        total_candidates: election.candidate_count,
        phase: election.phase,
        final_tally_root_set: election.final_tally_root_set,
        final_tally_root: election.final_tally_root,
        proof_uri: election.proof_uri.clone(),
        published_at: now,
    });

    Ok(())
}

#[event]
pub struct ResultsPublished {
    pub election: Pubkey,
    pub candidate: Pubkey,
    pub candidate_index: u8,
    pub candidate_votes: u64,
    pub total_candidates: u8,
    pub phase: ElectionPhase,
    pub final_tally_root_set: bool,
    pub final_tally_root: [u8; 32],
    pub proof_uri: String,
    pub published_at: i64,
}
