use crate::errors::VotingError;
use crate::state::{AdminMultisig, MAX_MULTISIG_ADMINS};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeMultisig<'info> {
    #[account(
        init,
        payer = payer,
        space = AdminMultisig::LEN,
        seeds = [b"multisig", payer.key().as_ref()],
        bump
    )]
    pub multisig: Account<'info, AdminMultisig>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeMultisig>, admins: Vec<Pubkey>, threshold: u8) -> Result<()> {
    require!(!admins.is_empty(), VotingError::InvalidMultisigConfig);
    require!(
        admins.len() <= MAX_MULTISIG_ADMINS,
        VotingError::InvalidMultisigConfig
    );
    require!(threshold > 0, VotingError::InvalidMultisigConfig);
    require!(
        threshold as usize <= admins.len(),
        VotingError::InvalidMultisigConfig
    );

    let mut unique_admins: Vec<Pubkey> = Vec::with_capacity(admins.len());
    for admin in admins {
        require!(
            !unique_admins.iter().any(|existing| existing == &admin),
            VotingError::InvalidMultisigConfig
        );
        unique_admins.push(admin);
    }

    let multisig = &mut ctx.accounts.multisig;
    multisig.admins = [Pubkey::default(); MAX_MULTISIG_ADMINS];
    for (idx, admin) in unique_admins.iter().enumerate() {
        multisig.admins[idx] = *admin;
    }
    multisig.admin_count = unique_admins.len() as u8;
    multisig.threshold = threshold;
    multisig.proposal_nonce = 0;
    multisig.bump = ctx.bumps.multisig;

    emit!(MultisigInitialized {
        multisig: multisig.key(),
        admin_count: multisig.admin_count,
        threshold,
    });

    Ok(())
}

#[event]
pub struct MultisigInitialized {
    pub multisig: Pubkey,
    pub admin_count: u8,
    pub threshold: u8,
}
