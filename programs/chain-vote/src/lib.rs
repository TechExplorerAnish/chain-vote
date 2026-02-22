use anchor_lang::prelude::*;

declare_id!("9JHuSg8vw8JNZ8RpyugiPejCSeY77uVs9ghRTfLe57cg");

#[program]
pub mod chain_vote {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
