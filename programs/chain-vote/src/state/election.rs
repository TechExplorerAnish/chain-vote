use anchor_lang::prelude::*;

#[account]
pub struct Election {
    pub authority: Pubkey,   // who created this election
    pub title: String,       // "Nepal General Election 2082"
    pub start_time: i64,     // unix timestamp when voting starts
    pub end_time: i64,       // unix timestamp when voting ends
    pub candidate_count: u8, // number of candidates existing in this election
    pub is_revealed: bool,   // whether the election result is revealed or not
    pub bumb: u8,            // PDA bump seed for this account
}

impl Election {
    // calculate how much storage space this account needs
    // 8 bytes for account discriminator

    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        (4 + 100) + // title (string with max length of 100)
        8 + // start_time
        8 + // end_time
        1 + // candidate_count
        1 + // is_revealed
        1; // bumb
}
