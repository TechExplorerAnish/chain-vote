use crate::errors::VotingError;
use crate::state::{Candidate, Election, ElectionPhase, VoterRecord, WhitelistEntry};
use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

#[derive(Accounts)]
#[instruction(candidate_index: u8)]
pub struct RevealVote<'info> {
    #[account(
        seeds = [b"election", election.admin.as_ref()],
        bump = election.bump,
    )]
    pub election: Account<'info, Election>,

    #[account(
        mut,
        seeds = [b"candidate", election.key().as_ref(), &[candidate_index]],
        bump = candidate.bump,
        constraint = candidate.election == election.key() @ VotingError::InvalidElectionState,
        constraint = candidate.index == candidate_index @ VotingError::CandidateNotFound,
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(
        mut,
        seeds = [b"voter", election.key().as_ref(), voter.key().as_ref()],
        bump = voter_record.bump,
        constraint = voter_record.election == election.key() @ VotingError::InvalidElectionState,
        constraint = voter_record.voter == voter.key() @ VotingError::UnauthorizedAccess,
    )]
    pub voter_record: Account<'info, VoterRecord>,

    #[account(
        seeds = [b"whitelist", election.key().as_ref(), voter.key().as_ref()],
        bump = whitelist_entry.bump,
        constraint = whitelist_entry.election == election.key() @ VotingError::InvalidElectionState,
        constraint = whitelist_entry.voter == voter.key() @ VotingError::UnauthorizedAccess,
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    pub voter: Signer<'info>,
}

pub fn handler(ctx: Context<RevealVote>, candidate_index: u8, salt: [u8; 32]) -> Result<()> {
    let election = &ctx.accounts.election;
    let now = Clock::get()?.unix_timestamp;

    require!(election.phase == ElectionPhase::RevealPhase, VotingError::InvalidElectionState);
    require!(ctx.accounts.whitelist_entry.is_active, VotingError::NotWhitelisted);

    let voter_record = &mut ctx.accounts.voter_record;
    require!(voter_record.has_committed, VotingError::InvalidElectionState);
    require!(!voter_record.has_revealed, VotingError::AlreadyVoted);

    let nonce_bytes = voter_record.nonce.to_le_bytes();
    let mut hasher = Sha256::new();
    hasher.update(b"vote-commitment-v1");
    hasher.update(election.key().as_ref());
    hasher.update(ctx.accounts.voter.key().as_ref());
    hasher.update([candidate_index]);
    hasher.update(nonce_bytes);
    hasher.update(salt);
    let expected: [u8; 32] = hasher.finalize().into();

    require!(expected == voter_record.commitment, VotingError::InvalidCommitment);

    let candidate = &mut ctx.accounts.candidate;
    candidate.encrypted_votes = candidate
        .encrypted_votes
        .checked_add(1)
        .ok_or(VotingError::Overflow)?;
    candidate.revealed_votes = candidate
        .revealed_votes
        .checked_add(1)
        .ok_or(VotingError::Overflow)?;

    candidate.is_revealed = true;

    voter_record.has_revealed = true;
    voter_record.revealed_at = now;
    voter_record.candidate_index = candidate_index;

    emit!(VoteRevealed {
        election: election.key(),
        voter: ctx.accounts.voter.key(),
        candidate: candidate.key(),
        candidate_index,
        timestamp: now,
    });

    Ok(())
}

#[event]
pub struct VoteRevealed {
    pub election: Pubkey,
    pub voter: Pubkey,
    pub candidate: Pubkey,
    pub candidate_index: u8,
    pub timestamp: i64,
}
