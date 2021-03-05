import {Signer} from "./signer";

export class Tokens {
  private _signer: Signer;

  constructor(signer: Signer) {
    this._signer = signer;
  }

  generateAccessToken(userID: string) {
    return this._signer.sign(
      {userID},
      process.env.ACCESS_TOKEN_SECRET!,
      {expiresIn: '1h'}
    );
  }

  generateRefreshToken(userID: string) {
    return this._signer.sign(
      {userID},
      process.env.REFRESH_TOKEN_SECRET!
    );
  }

  verifyAccessToken(token: string): string {
    const payload =
      this._signer.verify(token, process.env.ACCESS_TOKEN_SECRET!) as any;
    return payload.userID!;
  }

  verifyRefreshToken(token: string): string {
    const payload =
      this._signer.verify(token, process.env.REFRESH_TOKEN_SECRET!) as any;
    return payload.userID!;
  }
}