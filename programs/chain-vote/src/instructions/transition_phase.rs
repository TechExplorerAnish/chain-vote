use crate::errors::VotingError;
use crate::security::verify_multisig_signers;
use crate::state::{AdminMultisig, Election, ElectionPhase};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(next_phase: ElectionPhase)]
pub struct TransitionElectionPhase<'info> {
    #[account(
        mut,
        seeds = [b"election", admin.key().as_ref()],
        bump = election.bump,
        has_one = admin @ VotingError::UnauthorizedAccess,
        has_one = multisig @ VotingError::InvalidElectionState,
    )]
    pub election: Account<'info, Election>,

    #[account(
        seeds = [b"multisig", multisig_authority.key().as_ref()],
        bump = multisig.bump,
    )]
    pub multisig: Account<'info, AdminMultisig>,

    pub multisig_authority: Signer<'info>,

    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<TransitionElectionPhase>, next_phase: ElectionPhase) -> Result<()> {
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

    let election = &mut ctx.accounts.election;
    let now = Clock::get()?.unix_timestamp;

    let allowed = match (election.phase, next_phase) {
        (ElectionPhase::Created, ElectionPhase::RegistrationPhase) => true,
        (ElectionPhase::RegistrationPhase, ElectionPhase::VotingPhase) => true,
        (ElectionPhase::VotingPhase, ElectionPhase::RevealPhase) => {
            require!(now > election.end_time, VotingError::VotingStillOngoing);
            true
        }
        (ElectionPhase::RevealPhase, ElectionPhase::Finalized) => true,
        _ => false,
    };

    require!(allowed, VotingError::InvalidPhaseTransition);

    let previous_phase = election.phase;
    election.phase = next_phase;

    if next_phase == ElectionPhase::RevealPhase {
        election.revealed_at = now;
    }

    if next_phase == ElectionPhase::Finalized {
        election.is_revealed = true;
        election.finalized_at = now;
    }

    emit!(ElectionPhaseTransitioned {
        election: election.key(),
        previous_phase,
        next_phase,
        timestamp: now,
    });

    Ok(())
}

#[event]
pub struct ElectionPhaseTransitioned {
    pub election: Pubkey,
    pub previous_phase: ElectionPhase,
    pub next_phase: ElectionPhase,
    pub timestamp: i64,
}
