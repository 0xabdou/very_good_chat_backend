import {AxiosStatic} from "axios";

export default class GoogleAPI {
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

export type AuthProviderUser = {
  email: string,
  displayName: string,
  photoURL: string,
}