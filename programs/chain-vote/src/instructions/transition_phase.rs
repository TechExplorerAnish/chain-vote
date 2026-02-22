use crate::errors::VotingError;
use crate::security::hash_transition_phase_action;
use crate::state::{AdminMultisig, Election, ElectionPhase, GovernanceAction, GovernanceProposal};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(next_phase: ElectionPhase, proposal_nonce: u64)]
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

    #[account(
        mut,
        seeds = [b"proposal", multisig.key().as_ref(), &proposal_nonce.to_le_bytes()],
        bump = proposal.bump,
        constraint = proposal.multisig == multisig.key() @ VotingError::InvalidElectionState,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    pub multisig_authority: Signer<'info>,

    pub admin: Signer<'info>,
}

pub fn handler(
    ctx: Context<TransitionElectionPhase>,
    next_phase: ElectionPhase,
    proposal_nonce: u64,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    require!(proposal_nonce == proposal.nonce, VotingError::InvalidNonce);
    require!(proposal.executed, VotingError::ProposalNotExecutable);
    require!(!proposal.consumed, VotingError::ProposalConsumed);
    require!(
        proposal.action == GovernanceAction::TransitionPhase,
        VotingError::InvalidGovernanceAction
    );

    let expected_action_hash = hash_transition_phase_action(&ctx.accounts.election.key(), next_phase);
    require!(
        proposal.action_hash == expected_action_hash,
        VotingError::InvalidActionHash
    );

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
        require!(
            election.final_tally_root_set,
            VotingError::MissingFinalTallyRoot
        );
        require!(
            election.total_revealed_votes == election.total_committed_votes,
            VotingError::UnrevealedVotesRemaining
        );
        election.is_revealed = true;
        election.finalized_at = now;
    }

    proposal.consumed = true;

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
