use anchor_lang::prelude::*;

#[account]
pub struct VoterRecord {
    pub election: Pubkey,
    pub voter: Pubkey,
    pub commitment: [u8; 32],
    pub nonce: u64,
    pub has_committed: bool,
    pub has_revealed: bool,
    pub committed_at: i64,
    pub revealed_at: i64,
    pub candidate_index: u8,
    pub bump: u8,
}

impl VoterRecord {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 1 + 1;
}

#[account]
pub struct WhitelistEntry {
    pub election: Pubkey,
    pub voter: Pubkey,
    pub is_active: bool,
    pub bump: u8,
}

impl WhitelistEntry {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1;
}
