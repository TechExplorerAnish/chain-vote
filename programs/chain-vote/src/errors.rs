use anchor_lang::prelude::*;

#[error_code]
pub enum VottingError {
    #[msg("Voting has not started yet")]
    VotingNotStarted,

    #[msg("Voting window has ended")]
    VotingEnded,

    #[msg("Invalid candidate index")]
    InvalidCandidate,

    #[msg("You are not whitelisted to vote")]
    NotWhitelisted,

    #[msg("You have already voted")]
    AlreadyVoted,

    #[msg("Only the admin can perform this action")]
    Unauthorized,

    #[msg("Results have not been revealed yet")]
    ResultsNotRevealed,

    #[msg("Voting is still ongoing")]
    VotingStillOngoing,
}
