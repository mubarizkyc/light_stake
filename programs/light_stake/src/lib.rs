use anchor_lang::prelude::*;
pub mod state;
pub use state::*;

pub mod instructions;
use instructions::*;

declare_id!("9Zi6Vqckj9jCuLDkg7NJ8NAR9eJtX3V3XLJEJHGoRqc8");
/*
 the contract below is written for CoinBuzz
 A usser creares an account(he can create multipule) &  deposit some amounts into that
 he can check the balance
 he can withdraw ,if he withdraws completel amount close the vault

Three Instruction;
Deposit
Withdraw
Track
 */
#[program]
pub mod light_stake {
    use super::*;
    pub fn deposit(ctx: Context<Deposit>, seed: u64, deposit: u64) -> Result<()> {
        ctx.accounts.deposit(deposit)?;
        ctx.accounts.save_vault(seed, &ctx.bumps)
    }
    pub fn withdraw(ctx: Context<Withdraw>, withdraw: u64) -> Result<()> {
        ctx.accounts.withdraw(withdraw)
    }
}
