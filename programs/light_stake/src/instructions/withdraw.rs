use anchor_lang::prelude::*;

use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account, transfer_checked, CloseAccount, Mint, TokenAccount, TokenInterface,
        TransferChecked,
    },
};

use crate::Vault;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
    )]
    pub payer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        close = payer,
        has_one = payer,
        has_one = mint,
        seeds = [b"vault", payer.key().as_ref(), vault.seed.to_le_bytes().as_ref()],
        bump = vault.bump
    )]
    vault: Account<'info, Vault>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_ata: InterfaceAccount<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self, withdraw: u64) -> Result<()> {
        let signer_seeds: [&[&[u8]]; 1] = [&[
            b"vault",
            self.payer.to_account_info().key.as_ref(),
            &self.vault.seed.to_le_bytes()[..],
            &[self.vault.bump],
        ]];

        let accounts = TransferChecked {
            from: self.vault_ata.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.payer_ata.to_account_info(),
            authority: self.vault.to_account_info(),
        };

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        transfer_checked(ctx, withdraw, self.mint.decimals)?;

        let accounts = CloseAccount {
            account: self.vault_ata.to_account_info(),
            destination: self.payer.to_account_info(),
            authority: self.vault.to_account_info(),
        };

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            &signer_seeds,
        );

        close_account(ctx)
    }
}
