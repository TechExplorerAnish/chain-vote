use anchor_lang::prelude::*;

pub const MAX_MULTISIG_ADMINS: usize = 5;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum GovernanceAction {
    InitializeElection,
    TransitionPhase,
    PublishTallyRoot,
}

#[account]
pub struct AdminMultisig {
    pub admins: [Pubkey; MAX_MULTISIG_ADMINS],
    pub admin_count: u8,
    pub threshold: u8,
    pub proposal_nonce: u64,
    pub bump: u8,
}

impl AdminMultisig {
    pub const LEN: usize = 8 + (32 * MAX_MULTISIG_ADMINS) + 1 + 1 + 8 + 1;

    pub fn is_admin(&self, key: &Pubkey) -> bool {
        self.admins
            .iter()
            .take(self.admin_count as usize)
            .any(|admin| admin == key)
    }

    pub fn admin_index(&self, key: &Pubkey) -> Option<usize> {
        self.admins
            .iter()
            .take(self.admin_count as usize)
            .position(|admin| admin == key)
    }
}

#[account]
pub struct GovernanceProposal {
    pub multisig: Pubkey,
    pub proposer: Pubkey,
    pub action: GovernanceAction,
    pub action_hash: [u8; 32],
    pub init_election_title: String,
    pub init_election_start_time: i64,
    pub init_election_end_time: i64,
    pub has_init_election_payload: bool,
    pub nonce: u64,
    pub approvals: [bool; MAX_MULTISIG_ADMINS],
    pub approval_count: u8,
    pub executed: bool,
    pub consumed: bool,
    pub created_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

impl GovernanceProposal {
    pub const MAX_INIT_ELECTION_TITLE_LEN: usize = 100;

    pub const LEN: usize = 8
        + 32
        + 32
        + 1
        + 32
        + (4 + Self::MAX_INIT_ELECTION_TITLE_LEN)
        + 8
        + 8
        + 1
        + 8
        + MAX_MULTISIG_ADMINS
        + 1
        + 1
        + 1
        + 8
        + 8
        + 1;
}
