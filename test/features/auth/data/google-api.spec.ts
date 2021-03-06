import {anything, instance, mock, verify, when} from "ts-mockito";
import {AxiosResponse, AxiosStatic} from "axios";
import GoogleAPI, {AuthProviderUser} from "../../../../src/features/auth/data/google-api";

const MockAxios = mock<AxiosStatic>();
const googleAPI = new GoogleAPI(instance(MockAxios));

describe('getGoogleUser', () => {
  it(
    'should should call the google api and return a google user on success',
    async () => {
      // arrange
      const token = 'google_id_token';
      const googleUser = {
        email: 'user@email.com',
        name: 'User Name',
        picture: 'https://google.com/user_picture&s96-c',
      };
      const response  = {data: googleUser} as AxiosResponse;
      when(MockAxios.get(anything())).thenResolve(response)
      // act
      const result = await googleAPI.getGoogleUser(token);
      // assert
      verify(MockAxios.get(`${GoogleAPI.GOOGLE_API_URL}${token}`)).once();
      const expected : AuthProviderUser = {
        email: googleUser.email,
        displayName: googleUser.name,
        photoURL: googleUser.picture.replace('s96-c', 's500-c'),
      }
      expect(result).toStrictEqual(expected);
    }
  );
});