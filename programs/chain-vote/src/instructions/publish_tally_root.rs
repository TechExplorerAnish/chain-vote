use crate::errors::VotingError;
use crate::security::hash_publish_tally_root_action;
use crate::state::{AdminMultisig, Election, ElectionPhase, GovernanceAction, GovernanceProposal};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(_proposal_nonce: u64)]
pub struct PublishTallyRoot<'info> {
    #[account(
        mut,
        seeds = [b"election", admin.key().as_ref()],
        bump = election.bump,
        has_one = admin @ VotingError::UnauthorizedAccess,
        has_one = multisig @ VotingError::InvalidElectionState,
    )]
    pub election: Account<'info, Election>,

    pub multisig: Account<'info, AdminMultisig>,

    #[account(
        mut,
        seeds = [b"proposal", multisig.key().as_ref(), &_proposal_nonce.to_le_bytes()],
        bump = proposal.bump,
        constraint = proposal.multisig == multisig.key() @ VotingError::InvalidElectionState,
    )]
    pub proposal: Account<'info, GovernanceProposal>,

    pub admin: Signer<'info>,
}

pub fn handler(
    ctx: Context<PublishTallyRoot>,
    _proposal_nonce: u64,
    tally_root: [u8; 32],
    proof_uri: String,
) -> Result<()> {
    let election = &mut ctx.accounts.election;
    let proposal = &mut ctx.accounts.proposal;

    require!(
        election.phase == ElectionPhase::RevealPhase,
        VotingError::InvalidElectionState
    );
    require!(!election.final_tally_root_set, VotingError::AlreadyRevealed);
    require!(
        proof_uri.len() <= Election::MAX_PROOF_URI_LEN,
        VotingError::InvalidElectionState
    );

    require!(proposal.executed, VotingError::ProposalNotExecutable);
    require!(!proposal.consumed, VotingError::ProposalConsumed);
    require!(
        proposal.action == GovernanceAction::PublishTallyRoot,
        VotingError::InvalidGovernanceAction
    );

    let expected_hash = hash_publish_tally_root_action(&election.key(), &tally_root, &proof_uri);
    require!(proposal.action_hash == expected_hash, VotingError::InvalidActionHash);

    election.final_tally_root = tally_root;
    election.final_tally_root_set = true;
    election.proof_uri = proof_uri.clone();

    proposal.consumed = true;

    emit!(FinalTallyRootCommitted {
        election: election.key(),
        tally_root,
        proof_uri,
        total_revealed_votes: election.total_revealed_votes,
        total_committed_votes: election.total_committed_votes,
    });

    Ok(())
}

#[event]
pub struct FinalTallyRootCommitted {
    pub election: Pubkey,
    pub tally_root: [u8; 32],
    pub proof_uri: String,
    pub total_revealed_votes: u64,
    pub total_committed_votes: u64,
}
