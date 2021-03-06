import {AxiosStatic} from "axios";
import {inject, injectable} from "inversify";
import TYPES from "../../../service-locator/types";

@injectable()
export default class GoogleAPI {
  static GOOGLE_API_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token=';

  private _axios: AxiosStatic;

  constructor(@inject(TYPES.Axios) axios: AxiosStatic) {
    this._axios = axios;
  }

  async getGoogleUser(token: string): Promise<AuthProviderUser> {
    const response = await this._axios.get(
      `${GoogleAPI.GOOGLE_API_URL}${token}`
    );
    const data = response.data;
    return {
      email: data.email,
      displayName: data.name,
      photoURL: data.picture.replace('s96-c', 's500-c'),
    };
  }
}

export type AuthProviderUser = {
  email: string,
  displayName: string,
  photoURL: string,
}