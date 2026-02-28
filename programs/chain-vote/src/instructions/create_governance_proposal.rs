use crate::errors::VotingError;
use crate::state::{AdminMultisig, GovernanceAction, GovernanceProposal};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CreateGovernanceProposal<'info> {
    #[account(mut)]
    pub multisig: Account<'info, AdminMultisig>,

    #[account(
        init,
        payer = proposer,
        space = GovernanceProposal::LEN,
        seeds = [b"proposal", multisig.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    #[account(mut)]
    pub proposer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateGovernanceProposal>,
    nonce: u64,
    action: GovernanceAction,
    action_hash: [u8; 32],
    expires_at: i64,
    init_election_title: String,
    init_election_start_time: i64,
    init_election_end_time: i64,
) -> Result<()> {
    let multisig = &mut ctx.accounts.multisig;
    let proposer_key = ctx.accounts.proposer.key();
    let now = Clock::get()?.unix_timestamp;

    require!(
        multisig.is_admin(&proposer_key),
        VotingError::UnauthorizedAccess
    );
    require!(nonce == multisig.proposal_nonce, VotingError::InvalidNonce);
    require!(expires_at > now, VotingError::ProposalExpired);

    if action == GovernanceAction::InitializeElection {
        require!(
            !init_election_title.is_empty(),
            VotingError::InvalidElectionState
        );
        require!(
            init_election_title.len() <= GovernanceProposal::MAX_INIT_ELECTION_TITLE_LEN,
            VotingError::TitleTooLong
        );
        require!(
            init_election_end_time > init_election_start_time,
            VotingError::InvalidTimeRange
        );
    }

    let proposer_index = multisig
        .admin_index(&proposer_key)
        .ok_or(VotingError::UnauthorizedAccess)?;

    let proposal = &mut ctx.accounts.proposal;
    proposal.multisig = multisig.key();
    proposal.proposer = proposer_key;
    proposal.action = action;
    proposal.action_hash = action_hash;
    if action == GovernanceAction::InitializeElection {
        proposal.init_election_title = init_election_title;
        proposal.init_election_start_time = init_election_start_time;
        proposal.init_election_end_time = init_election_end_time;
        proposal.has_init_election_payload = true;
    } else {
        proposal.init_election_title = String::new();
        proposal.init_election_start_time = 0;
        proposal.init_election_end_time = 0;
        proposal.has_init_election_payload = false;
    }
    proposal.nonce = nonce;
    proposal.approvals = [false; crate::state::MAX_MULTISIG_ADMINS];
    proposal.approvals[proposer_index] = true;
    proposal.approval_count = 1;
    proposal.executed = false;
    proposal.consumed = false;
    proposal.created_at = now;
    proposal.expires_at = expires_at;
    proposal.bump = ctx.bumps.proposal;

    multisig.proposal_nonce = multisig
        .proposal_nonce
        .checked_add(1)
        .ok_or(VotingError::Overflow)?;

    emit!(GovernanceProposalCreated {
        multisig: multisig.key(),
        proposal: proposal.key(),
        action,
        nonce,
        proposer: proposer_key,
        expires_at,
    });

    Ok(())
}

#[event]
pub struct GovernanceProposalCreated {
    pub multisig: Pubkey,
    pub proposal: Pubkey,
    pub action: GovernanceAction,
    pub nonce: u64,
    pub proposer: Pubkey,
    pub expires_at: i64,
}
