use crate::errors::VotingError;
use crate::state::{Election, ElectionPhase, WhitelistEntry};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(voter_pubkey: Pubkey)]
pub struct RegisterVoter<'info> {
    #[account(
        seeds = [b"election", admin.key().as_ref()],
        bump = election.bump,
        has_one = admin @ VotingError::UnauthorizedAccess
    )]
    pub election: Account<'info, Election>,

    #[account(
        init,
        payer = admin,
        space = WhitelistEntry::LEN,
        seeds = [b"whitelist", election.key().as_ref(), voter_pubkey.as_ref()],
        bump
    )]
    pub whitelist_entry: Account<'info, WhitelistEntry>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterVoter>, voter_pubkey: Pubkey) -> Result<()> {
    let election = &ctx.accounts.election;
    let clock = Clock::get()?;

    require!(
        election.phase == ElectionPhase::RegistrationPhase,
        VotingError::InvalidElectionState
    );

    require!(
        clock.unix_timestamp < election.start_time,
        VotingError::VotingAlreadyStarted
    );

    let whitelist_entry = &mut ctx.accounts.whitelist_entry;
    whitelist_entry.election = ctx.accounts.election.key();
    whitelist_entry.voter = voter_pubkey;
    whitelist_entry.is_active = true;
    whitelist_entry.bump = ctx.bumps.whitelist_entry;

    emit!(VoterRegistered {
        election: election.key(),
        voter: voter_pubkey,
    });

    msg!("Voter whitelisted: {}", voter_pubkey);

    Ok(())
}

#[event]
pub struct VoterRegistered {
    pub election: Pubkey,
    pub voter: Pubkey,
}
