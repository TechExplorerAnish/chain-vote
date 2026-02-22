use crate::errors::VotingError;
use crate::security::hash_initialize_election_action;
use crate::state::{AdminMultisig, Election, ElectionPhase, GovernanceAction, GovernanceProposal};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(proposal_nonce: u64)]
pub struct InitializeElection<'info> {
    #[account(
        init,
        payer = admin,
        space = Election::LEN,
        seeds = [b"election", admin.key().as_ref()],
        bump
    )]
    pub election: Account<'info, Election>,

    #[account(
        seeds = [b"multisig", multisig_authority.key().as_ref()],
        bump = multisig.bump,
    )]
    pub multisig: Account<'info, AdminMultisig>,

    #[account(
        mut,
        seeds = [b"proposal", multisig.key().as_ref(), &proposal_nonce.to_le_bytes()],
        bump = proposal.bump,
        constraint = proposal.multisig == multisig.key() @ VotingError::InvalidElectionState,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    pub multisig_authority: Signer<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeElection>,
    proposal_nonce: u64,
    title: String,
    start_time: i64,
    end_time: i64,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    require!(proposal_nonce == proposal.nonce, VotingError::InvalidNonce);
    require!(proposal.executed, VotingError::ProposalNotExecutable);
    require!(!proposal.consumed, VotingError::ProposalConsumed);
    require!(
        proposal.action == GovernanceAction::InitializeElection,
        VotingError::InvalidGovernanceAction
    );

    require!(
        title.len() <= Election::MAX_TITLE_LEN,
        VotingError::TitleTooLong
    );
    require!(end_time > start_time, VotingError::InvalidTimeRange);

    let clock = Clock::get()?;
    require!(
        start_time >= clock.unix_timestamp,
        VotingError::StartTimeInPast
    );

    let expected_action_hash =
        hash_initialize_election_action(&ctx.accounts.admin.key(), &title, start_time, end_time);
    require!(
        proposal.action_hash == expected_action_hash,
        VotingError::InvalidActionHash
    );

    let election = &mut ctx.accounts.election;
    election.multisig = ctx.accounts.multisig.key();
    election.admin = ctx.accounts.admin.key();
    election.title = title;
    election.start_time = start_time;
    election.end_time = end_time;
    election.phase = ElectionPhase::Created;
    election.candidate_count = 0;
    election.total_committed_votes = 0;
    election.total_revealed_votes = 0;
    election.final_tally_root = [0; 32];
    election.final_tally_root_set = false;
    election.proof_uri = String::new();
    election.is_revealed = false;
    election.revealed_at = 0;
    election.finalized_at = 0;
    election.bump = ctx.bumps.election;

    proposal.consumed = true;

    emit!(ElectionInitialized {
        election: election.key(),
        admin: election.admin,
        start_time,
        end_time,
    });

    msg!("Election initialized: {}", election.title);
    msg!("Voting window: {} to {}", start_time, end_time);

    Ok(())
}

#[event]
pub struct ElectionInitialized {
    pub election: Pubkey,
    pub admin: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
}
