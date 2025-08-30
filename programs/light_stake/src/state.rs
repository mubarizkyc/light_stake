use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub seed: u64,
    pub payer: Pubkey,
    pub mint: Pubkey,
    pub bump: u8,
}
