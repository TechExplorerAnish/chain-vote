use crate::errors::VotingError;
use crate::state::{AdminMultisig, ElectionPhase};
use anchor_lang::prelude::*;
use sha2::{Digest, Sha256};

pub fn verify_multisig_signers(
    multisig: &AdminMultisig,
    proposer: &Pubkey,
    co_signer_keys: &[Pubkey],
) -> Result<()> {
    require!(multisig.is_admin(proposer), VotingError::UnauthorizedAccess);

    let mut signers: Vec<Pubkey> = vec![*proposer];

    for key in co_signer_keys {
        if multisig.is_admin(key) && !signers.iter().any(|existing| *existing == *key) {
            signers.push(*key);
        }
    }

    require!(
        signers.len() >= multisig.threshold as usize,
        VotingError::UnauthorizedAccess
    );

    Ok(())
}

pub fn hash_initialize_election_action(
    admin: &Pubkey,
    title: &str,
    start_time: i64,
    end_time: i64,
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"governance-action-v1");
    hasher.update(b"initialize-election");
    hasher.update(admin.as_ref());
    hasher.update(title.as_bytes());
    hasher.update(start_time.to_le_bytes());
    hasher.update(end_time.to_le_bytes());
    hasher.finalize().into()
}

pub fn hash_transition_phase_action(election: &Pubkey, next_phase: ElectionPhase) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"governance-action-v1");
    hasher.update(b"transition-phase");
    hasher.update(election.as_ref());
    hasher.update([next_phase as u8]);
    hasher.finalize().into()
}

pub fn hash_publish_tally_root_action(
    election: &Pubkey,
    tally_root: &[u8; 32],
    proof_uri: &str,
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"governance-action-v1");
    hasher.update(b"publish-tally-root");
    hasher.update(election.as_ref());
    hasher.update(tally_root);
    hasher.update(proof_uri.as_bytes());
    hasher.finalize().into()
}
