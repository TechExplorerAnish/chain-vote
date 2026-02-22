use anchor_lang::prelude::*;

pub const MAX_MULTISIG_ADMINS: usize = 5;

#[account]
pub struct AdminMultisig {
    pub admins: [Pubkey; MAX_MULTISIG_ADMINS],
    pub admin_count: u8,
    pub threshold: u8,
    pub bump: u8,
}

impl AdminMultisig {
    pub const LEN: usize = 8 + (32 * MAX_MULTISIG_ADMINS) + 1 + 1 + 1;

    pub fn is_admin(&self, key: &Pubkey) -> bool {
        self.admins
            .iter()
            .take(self.admin_count as usize)
            .any(|admin| admin == key)
    }
}
