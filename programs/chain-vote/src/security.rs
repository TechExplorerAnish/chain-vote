use crate::errors::VotingError;
use crate::state::AdminMultisig;
use anchor_lang::prelude::*;

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
