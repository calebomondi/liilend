"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { LIILEND_IDL } from "@/lib/idl";
import type { Liilend } from "../../../target/types/liilend";

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      AnchorProvider.defaultOptions()
    );
    return new Program(LIILEND_IDL, provider) as unknown as Program<Liilend>;
  }, [connection, wallet]);

  const ready = !!program;

  return { program, ready, publicKey: wallet.publicKey };
}
