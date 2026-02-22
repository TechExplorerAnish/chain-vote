use anchor_lang::prelude::*;

#[error_code]
pub enum VotingError {
    #[msg("Voting has not started yet")]
    VotingNotStarted,

    #[msg("Voting is closed")]
    VotingClosed,

    #[msg("Voting is still ongoing")]
    VotingStillOngoing,

    #[msg("Voting has already started")]
    VotingAlreadyStarted,

    #[msg("Start time cannot be in the past")]
    StartTimeInPast,

    #[msg("End time must be after start time")]
    InvalidTimeRange,

    #[msg("Unauthorized access")]
    UnauthorizedAccess,

    #[msg("Wallet is not whitelisted")]
    NotWhitelisted,

    #[msg("Wallet has already voted")]
    AlreadyVoted,

    #[msg("Candidate not found")]
    CandidateNotFound,

    #[msg("Candidate index must match the current candidate count")]
    InvalidCandidateIndex,

    #[msg("Results have already been revealed")]
    AlreadyRevealed,

    #[msg("A required candidate account was not provided")]
    CandidateAccountMissing,

    #[msg("Invalid election state")]
    InvalidElectionState,

    #[msg("Invalid election phase transition")]
    InvalidPhaseTransition,

    #[msg("Invalid vote commitment")]
    InvalidCommitment,

    #[msg("Invalid nonce")]
    InvalidNonce,

    #[msg("Invalid multisig configuration")]
    InvalidMultisigConfig,

    #[msg("Governance proposal has expired")]
    ProposalExpired,

    #[msg("Signer has already approved this proposal")]
    ProposalAlreadyApproved,

    #[msg("Proposal has not reached threshold")]
    ProposalNotExecutable,

    #[msg("Proposal already consumed")]
    ProposalConsumed,

    #[msg("Invalid governance action")]
    InvalidGovernanceAction,

    #[msg("Invalid governance action hash")]
    InvalidActionHash,

    #[msg("Final tally root not committed")]
    MissingFinalTallyRoot,

    #[msg("Not all committed votes are revealed")]
    UnrevealedVotesRemaining,

    #[msg("Election title is too long")]
    TitleTooLong,

    #[msg("Candidate name is too long")]
    NameTooLong,

    #[msg("Party name is too long")]
    PartyNameTooLong,

    #[msg("Arithmetic overflow")]
    Overflow,
}
