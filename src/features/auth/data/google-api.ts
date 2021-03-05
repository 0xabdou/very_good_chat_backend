import {AxiosStatic} from "axios";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";

@injectable()
export default class GoogleAPI {
  private _axios: AxiosStatic;

  constructor(@inject(TYPES.Axios) axios: AxiosStatic) {
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
    const error = new Error("Invalid google token");
    error.name = 'INVALID_GOOGLE_TOKEN';
    throw error;
  }
}

export type AuthProviderUser = {
  email: string,
  displayName: string,
  photoURL: string,
}