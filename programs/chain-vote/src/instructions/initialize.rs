use crate::errors::VotingError;
use crate::security::verify_multisig_signers;
use crate::state::{AdminMultisig, Election, ElectionPhase};
use anchor_lang::prelude::*;

#[derive(Accounts)]
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

    pub multisig_authority: Signer<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeElection>,
    title: String,
    start_time: i64,
    end_time: i64,
) -> Result<()> {
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

    let election = &mut ctx.accounts.election;
    election.multisig = ctx.accounts.multisig.key();
    election.admin = ctx.accounts.admin.key();
    election.title = title;
    election.start_time = start_time;
    election.end_time = end_time;
    election.phase = ElectionPhase::Created;
    election.candidate_count = 0;
    election.is_revealed = false;
    election.revealed_at = 0;
    election.finalized_at = 0;
    election.bump = ctx.bumps.election;

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
