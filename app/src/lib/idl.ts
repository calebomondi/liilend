import { Idl } from "@coral-xyz/anchor";
import { PROGRAM_ID } from "@/utils/constants";
import idlJson from "./liilend-idl.json";

export const LIILEND_IDL: Idl = {
  ...idlJson,
  address: PROGRAM_ID,
} as Idl;
