use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ElectionPhase {
    Created,
    RegistrationPhase,
    VotingPhase,
    RevealPhase,
    Finalized,
}

#[account]
pub struct Election {
    pub multisig: Pubkey,
    pub admin: Pubkey,
    pub title: String,
    pub start_time: i64,
    pub end_time: i64,
    pub phase: ElectionPhase,
    pub candidate_count: u8,
    pub is_revealed: bool,
    pub revealed_at: i64,
    pub finalized_at: i64,
    pub bump: u8,
}

impl Election {
    pub const MAX_TITLE_LEN: usize = 100;

    pub const LEN: usize = 8
        + 32
        + 32
        + (4 + Self::MAX_TITLE_LEN)
        + 8
        + 8
        + 1
        + 1
        + 1
        + 8
        + 8
        + 1;
}
