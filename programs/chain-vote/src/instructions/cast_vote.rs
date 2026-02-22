use crate::errors::VotingError;
use crate::state::{Election, ElectionPhase, VoterRecord, WhitelistEntry};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(_commitment: [u8; 32], _nonce: u64)]
pub struct CastVote<'info> {
    #[account(
        mut,
        seeds = [b"election", election.admin.as_ref()],
        bump = election.bump,
    )]
    pub election: Account<'info, Election>,

    #[account(
        init_if_needed,
        payer = voter,
        space = VoterRecord::LEN,
        seeds = [b"voter", election.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub voter_record: Account<'info, VoterRecord>,

    #[account(
        seeds = [b"whitelist", election.key().as_ref(), voter.key().as_ref()],
        bump = whitelist_entry.bump,
        constraint = whitelist_entry.election == election.key() @ VotingError::InvalidElectionState,
        constraint = whitelist_entry.voter == voter.key() @ VotingError::UnauthorizedAccess,
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CastVote>, commitment: [u8; 32], nonce: u64) -> Result<()> {
    let election = &mut ctx.accounts.election;
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    require!(
        election.phase == ElectionPhase::VotingPhase,
        VotingError::InvalidElectionState
    );
    require!(now >= election.start_time, VotingError::VotingNotStarted);
    require!(now <= election.end_time, VotingError::VotingClosed);
    require!(nonce > 0, VotingError::InvalidNonce);

    require!(
        ctx.accounts.whitelist_entry.is_active,
        VotingError::NotWhitelisted
    );

    let voter_record = &mut ctx.accounts.voter_record;
    require!(!voter_record.has_committed, VotingError::AlreadyVoted);

    voter_record.election = election.key();
    voter_record.voter = ctx.accounts.voter.key();
    voter_record.commitment = commitment;
    voter_record.nonce = nonce;
    voter_record.has_committed = true;
    voter_record.has_revealed = false;
    voter_record.committed_at = now;
    voter_record.revealed_at = 0;
    voter_record.candidate_index = u8::MAX;
    voter_record.bump = ctx.bumps.voter_record;

    election.total_committed_votes = election
        .total_committed_votes
        .checked_add(1)
        .ok_or(VotingError::Overflow)?;

    emit!(VoteCommitted {
        election: election.key(),
        voter: ctx.accounts.voter.key(),
        commitment,
        nonce,
        timestamp: now,
    });

    msg!(
        "Vote cast by {} at timestamp {}",
        ctx.accounts.voter.key(),
        now
    );

    Ok(())
}

#[event]
pub struct VoteCommitted {
    pub election: Pubkey,
    pub voter: Pubkey,
    pub commitment: [u8; 32],
    pub nonce: u64,
    pub timestamp: i64,
}
