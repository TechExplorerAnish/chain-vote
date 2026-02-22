use anchor_lang::prelude::*;

#[account]
pub struct Candidate {
    pub election: Pubkey,     // which election this candidate belongs to
    pub name: String,         // candidate name
    pub party: String,        // candidate party
    pub index: u8,            // candidate index in the election
    pub encrypted_votes: u64, // number of votes this candidate received (encrypted)
    pub revealed_votes: u64,  // shown after reveal phase
    pub bumb: u8,             // PDA bump seed for this account
}

impl Candidate {
    // calculate how much storage space this account needs
    // 8 bytes for account discriminator

    pub const LEN: usize = 8 + // discriminator
        32 + // election
        (4 + 100) + // name (string with max length of 100)
        (4 + 100) + // party (string with max length of 100)
        1 + // index
        8 + // encrypted_votes
        8 + // revealed_votes
        1; // bumb
}
