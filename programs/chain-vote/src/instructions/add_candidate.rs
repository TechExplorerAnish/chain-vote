use crate::errors::VotingError;
use crate::state::{Candidate, Election, ElectionPhase};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(name: String, party: String, index: u8)]
pub struct AddCandidate<'info> {
    #[account(
        mut,
        seeds = [b"election", admin.key().as_ref()],
        bump = election.bump,
        has_one = admin @ VotingError::UnauthorizedAccess
    )]
    pub election: Account<'info, Election>,

    #[account(
        init,
        payer = admin,
        space = Candidate::LEN,
        seeds = [b"candidate", election.key().as_ref(), &[index]],
        bump
    )]
    pub candidate: Account<'info, Candidate>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddCandidate>, name: String, party: String, index: u8) -> Result<()> {
    let election = &ctx.accounts.election;
    let clock = Clock::get()?;

    require!(
        name.len() <= Candidate::MAX_NAME_LEN,
        VotingError::NameTooLong
    );
    require!(
        party.len() <= Candidate::MAX_PARTY_LEN,
        VotingError::PartyNameTooLong
    );

    require!(
        election.phase == ElectionPhase::RegistrationPhase,
        VotingError::InvalidElectionState
    );

    require!(
        clock.unix_timestamp < election.start_time,
        VotingError::VotingAlreadyStarted
    );

    require!(
        index == election.candidate_count,
        VotingError::InvalidCandidateIndex
    );

    let candidate = &mut ctx.accounts.candidate;
    candidate.election = ctx.accounts.election.key();
    candidate.name = name.clone();
    candidate.party = party.clone();
    candidate.index = index;
    candidate.encrypted_votes = 0;
    candidate.revealed_votes = 0;
    candidate.is_revealed = false;
    candidate.bump = ctx.bumps.candidate;

    let election = &mut ctx.accounts.election;
    election.candidate_count += 1;

    emit!(CandidateRegistered {
        election: election.key(),
        candidate: candidate.key(),
        index,
    });

    msg!("Candidate #{} added: {} ({})", index, name, party);

    Ok(())
}

#[event]
pub struct CandidateRegistered {
    pub election: Pubkey,
    pub candidate: Pubkey,
    pub index: u8,
}
