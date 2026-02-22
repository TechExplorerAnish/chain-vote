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
    pub total_committed_votes: u64,
    pub total_revealed_votes: u64,
    pub final_tally_root: [u8; 32],
    pub final_tally_root_set: bool,
    pub proof_uri: String,
    pub is_revealed: bool,
    pub revealed_at: i64,
    pub finalized_at: i64,
    pub bump: u8,
}

impl Election {
    pub const MAX_TITLE_LEN: usize = 100;
    pub const MAX_PROOF_URI_LEN: usize = 200;

    pub const LEN: usize = 8
        + 32
        + 32
        + (4 + Self::MAX_TITLE_LEN)
        + 8
        + 8
        + 1
        + 1
        + 8
        + 8
        + 32
        + 1
        + (4 + Self::MAX_PROOF_URI_LEN)
        + 1
        + 8
        + 8
        + 1;
}
