import {Signer} from "./signer";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";

@injectable()
export class Tokens {
  private _signer: Signer;

  constructor(@inject(TYPES.signer) signer: Signer) {
    this._signer = signer;
  }

  generateAccessToken(userID: string) {
    return this._signer.sign(
      {userID},
      process.env.ACCESS_TOKEN_SECRET!,
      {expiresIn: '30m'}
    );
  }

  generateRefreshToken(userID: string) {
    return this._signer.sign(
      {userID},
      process.env.REFRESH_TOKEN_SECRET!
    );
  }

  verifyAccessToken(token: string): string {
    return this._verifyToken(token, process.env.ACCESS_TOKEN_SECRET!);
  }

  verifyRefreshToken(token: string): string {
    return this._verifyToken(token, process.env.REFRESH_TOKEN_SECRET!);
  }

  private _verifyToken(token: string, secret: string) {
    const payload =
      this._signer.verify(token, secret) as any;
    return payload.userID!;
  }
}
