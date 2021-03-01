import {AxiosStatic} from "axios";
import {PrismaClient} from "@prisma/client";
import * as JWT from "jsonwebtoken";

export type AuthProviderUser = {
  email: string,
  displayName: string,
  photoURL: string,
}

export class GoogleAPI {
  private _axios: AxiosStatic;

  constructor(axios: AxiosStatic) {
    this._axios = axios;
  }

  async getGoogleUser(token: string): Promise<AuthProviderUser> {
    const response = await this._axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    );
    if (response.status === 200) {
      const data = response.data;
      return {
        email: data.email,
        displayName: data.name,
        photoURL: data.picture.replace('s96-c', 's500-c'),
      };
    }
    throw new Error("Invalid google token");
  }
}


export class AuthStore {
  private _prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this._prisma = prisma;
  }

  async findAuthUserById(id: string) {
    return this._prisma.authUser.findUnique({where: {id}});
  }

  async findOrCreateAuthUser(email: string) {
    const authUser = await this._prisma.authUser.findUnique({where: {email}});
    if (authUser) return authUser;

    return await this._prisma.authUser.create({data: {email}});
  }
}

export const signer = {
  sign: JWT.sign,
  verify: JWT.verify,
};

export type Signer = typeof signer;

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
      process.env.ACCESS_TOKEN_SECRET!
    );
  }

  verifyToken(token: string): string {
    const payload =
      this._signer.verify(token, process.env.ACCESS_TOKEN_SECRET!) as any;
    return payload.userID!;
  }
}





