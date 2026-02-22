use crate::errors::VotingError;
use crate::state::{AdminMultisig, GovernanceProposal};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ApproveGovernanceProposal<'info> {
    pub multisig: Account<'info, AdminMultisig>,

    #[account(
        mut,
        constraint = proposal.multisig == multisig.key() @ VotingError::InvalidElectionState,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    pub approver: Signer<'info>,
}

pub fn handler(ctx: Context<ApproveGovernanceProposal>) -> Result<()> {
    let multisig = &ctx.accounts.multisig;
    let proposal = &mut ctx.accounts.proposal;
    let approver_key = ctx.accounts.approver.key();
    let now = Clock::get()?.unix_timestamp;

    require!(multisig.is_admin(&approver_key), VotingError::UnauthorizedAccess);
    require!(now <= proposal.expires_at, VotingError::ProposalExpired);
    require!(!proposal.executed, VotingError::ProposalNotExecutable);

    let approver_index = multisig
        .admin_index(&approver_key)
        .ok_or(VotingError::UnauthorizedAccess)?;

    require!(
        !proposal.approvals[approver_index],
        VotingError::ProposalAlreadyApproved
    );

    proposal.approvals[approver_index] = true;
    proposal.approval_count = proposal
        .approval_count
        .checked_add(1)
        .ok_or(VotingError::Overflow)?;

    emit!(GovernanceProposalApproved {
        proposal: proposal.key(),
        approver: approver_key,
        approval_count: proposal.approval_count,
    });

    Ok(())
}

#[event]
pub struct GovernanceProposalApproved {
    pub proposal: Pubkey,
    pub approver: Pubkey,
    pub approval_count: u8,
}
