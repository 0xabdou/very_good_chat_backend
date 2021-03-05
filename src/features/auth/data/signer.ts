import * as JWT from "jsonwebtoken";

const signer = {
  sign: JWT.sign,
  verify: JWT.verify,
};

export type Signer = typeof signer;
export default signer;
