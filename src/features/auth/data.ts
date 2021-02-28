import {AxiosStatic} from "axios";
import {PrismaClient} from "@prisma/client";

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
        photoURL: data.picture,
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

  async findOrCreateAuthUser(email: string) {
    const authUser = await this._prisma.authUser.findUnique({where: {email}});
    if (authUser) return authUser;

    return await this._prisma.authUser.create({data: {email}});
  }
}