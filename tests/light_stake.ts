import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { LightStake } from "../target/types/light_stake";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { randomBytes } from "crypto";

describe("light_stake", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  const connection = provider.connection;


  const program = anchor.workspace.lightStake as Program<LightStake>;
  //const tokenProgram = TOKEN_2022_PROGRAM_ID;
  const tokenProgram = TOKEN_PROGRAM_ID;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };

  const seed = new BN(randomBytes(8));
  const payer = provider.wallet;
  const mint = Keypair.generate();
  const payerAta = getAssociatedTokenAddressSync(mint.publicKey, payer.publicKey, false, tokenProgram);
  console.log("payerAta", payerAta.toString());


  const vault = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), payer.publicKey.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
    program.programId
  )[0];
  const vaultAta = getAssociatedTokenAddressSync(mint.publicKey, vault, true, tokenProgram);

  const accounts = {

    payer: payer.publicKey,
    mint: mint.publicKey,
    payerAta,
    vault,
    vaultAta,
    tokenProgram,
  }
  it("create mint and mint tokens", async () => {
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    const tx = new Transaction().add(
      // 1. Create mint account
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: tokenProgram,
      }),

      // 2. Initialize mint
      createInitializeMint2Instruction(
        mint.publicKey,
        6, // decimals
        payer.publicKey, // mint authority
        null, // freeze authority
        tokenProgram
      )
    );

    // 3. Create ATA and mint tokens
    const ataIx = createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      payerAta,
      payer.publicKey,
      mint.publicKey,
      tokenProgram,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    tx.add(ataIx);

    const mintToIx = createMintToInstruction(
      mint.publicKey,
      payerAta,
      payer.publicKey,
      1_000_000_000, // 1e9 tokens (with 6 decimals → 1000 tokens)
      [],
      tokenProgram
    );
    tx.add(mintToIx);


    // Send and confirm
    await provider.sendAndConfirm(tx, [payer.payer, mint]).then((sig) => {
      console.log("Mint created and funded:", sig);
    });
  });
  it("Deposit", async () => {
    await program.methods
      .deposit(seed, new BN(1e6))
      .accounts({ ...accounts })
      .signers([payer.payer])
      .rpc()
      .then(confirm)
      .then(log);
  });
  console.log("balance track done ");
  console.log("deposit successful");
  it("Withdraw", async () => {
    try {
      await program.methods
        .withdraw(new BN(1e6))
        .accounts({ ...accounts })
        .signers([payer.payer])
        .rpc()
        .then(confirm)
        .then(log);
    } catch (e) {
      console.log(e);
      throw (e)
    }
  });
  console.log("withdraw successful");
});
