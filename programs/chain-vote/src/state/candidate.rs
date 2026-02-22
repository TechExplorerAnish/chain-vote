use anchor_lang::prelude::*;

#[account]
pub struct Candidate {
    pub election: Pubkey,
    pub name: String,
    pub party: String,
    pub index: u8,
    pub encrypted_votes: u64,
    pub revealed_votes: u64,
    pub is_revealed: bool,
    pub bump: u8,
}

impl Candidate {
    pub const MAX_NAME_LEN: usize = 100;
    pub const MAX_PARTY_LEN: usize = 100;

    pub const LEN: usize =
        8 + 32 + (4 + Self::MAX_NAME_LEN) + (4 + Self::MAX_PARTY_LEN) + 1 + 8 + 8 + 1 + 1;
}
