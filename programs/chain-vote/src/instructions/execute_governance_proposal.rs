use crate::errors::VotingError;
use crate::state::{AdminMultisig, GovernanceProposal};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ExecuteGovernanceProposal<'info> {
    pub multisig: Account<'info, AdminMultisig>,

    #[account(
        mut,
        constraint = proposal.multisig == multisig.key() @ VotingError::InvalidElectionState,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    pub executor: Signer<'info>,
}

pub fn handler(ctx: Context<ExecuteGovernanceProposal>) -> Result<()> {
    let multisig = &ctx.accounts.multisig;
    let proposal = &mut ctx.accounts.proposal;
    let executor_key = ctx.accounts.executor.key();
    let now = Clock::get()?.unix_timestamp;

    require!(multisig.is_admin(&executor_key), VotingError::UnauthorizedAccess);
    require!(now <= proposal.expires_at, VotingError::ProposalExpired);
    require!(!proposal.executed, VotingError::ProposalNotExecutable);
    require!(
        proposal.approval_count >= multisig.threshold,
        VotingError::ProposalNotExecutable
    );

    proposal.executed = true;

    emit!(GovernanceProposalExecuted {
        proposal: proposal.key(),
        executor: executor_key,
        action_hash: proposal.action_hash,
    });

    Ok(())
}

#[event]
pub struct GovernanceProposalExecuted {
    pub proposal: Pubkey,
    pub executor: Pubkey,
    pub action_hash: [u8; 32],
}
