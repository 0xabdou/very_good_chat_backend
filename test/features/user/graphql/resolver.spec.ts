import {
  anything,
  deepEqual,
  instance,
  mock,
  reset,
  resetCalls,
  verify,
  when
} from "ts-mockito";
import UserDataSource
  from "../../../../src/features/user/data/user-data-source";
import Context from "../../../../src/shared/context";
import {UserValidators} from "../../../../src/features/user/graphql/validators";
import FileUtils from "../../../../src/shared/utils/file-utils";
import {UserResolver} from "../../../../src/features/user/graphql/resolver";
import {mockGraphQLUser} from "../../../mock-objects";
import {
  User,
  UserCreation,
  UserUpdate
} from "../../../../src/features/user/graphql/types";
import {FileUpload} from "graphql-upload";

const MockUserDataSource = mock<UserDataSource>();
const MockUserValidators = mock<UserValidators>();
const MockFileUtils = mock<FileUtils>();

const userID = 'userIDDDD';
const req = {
  protocol: 'https',
  hostname: 'veryGoodHostName',
};
const context = {
  req,
  userID,
  toolBox: {
    dataSources: {
      userDS: instance(MockUserDataSource),
    },
    validators: {
      user: instance(MockUserValidators)
    },
    utils: {
      file: instance(MockFileUtils),
    }
  }
} as Context;

const resolver = new UserResolver();

beforeEach(() => {
  resetCalls(MockUserDataSource);
  resetCalls(MockUserValidators);
  resetCalls(MockFileUtils);
});

describe('_completePhotoUrl', () => {
  const ogPort = process.env.PORT;
  const photoURL = mockGraphQLUser.photoURL;

  afterAll(() => {
    process.env.PORT = ogPort;
  });

  it('should return the correct url if the port is 80', () => {
    // arrange
    process.env.PORT = '80';
    // act
    const result = resolver._completePhotoUrl(photoURL, context);
    // assert
    expect(result).toBe(`${req.protocol}://${req.hostname}/${photoURL}`);
  });

  it('should return the correct url if the port is 443', () => {
    // arrange
    process.env.PORT = '443';
    // act
    const result = resolver._completePhotoUrl(photoURL, context);
    // assert
    expect(result).toBe(`${req.protocol}://${req.hostname}/${photoURL}`);
  });

  it('should return the correct url if the port 5432', () => {
    // arrange
    process.env.PORT = '5432';
    // act
    const result = resolver._completePhotoUrl(photoURL, context);
    // assert
    expect(result).toBe(`${req.protocol}://${req.hostname}:5432/${photoURL}`);
  });
});

describe('me', () => {
  it('should throw an error if the user is not found', async () => {
    // arrange
    when(MockUserDataSource.getUser(anything())).thenResolve(null);
    // act
    const result = await (async () => {
      try {
        await resolver.me(context);
      } catch (e) {
        return e;
      }
    })();
    // assert
    expect(result.extensions.code).toBe('USER_NOT_FOUND');
  });

  it('should return the user if it exists', async () => {
    // arrange
    when(MockUserDataSource.getUser(anything())).thenResolve(mockGraphQLUser);
    // act
    const result = await resolver.me(context);
    // assert
    const expected: User = {
      ...mockGraphQLUser,
      photoURL: resolver._completePhotoUrl(mockGraphQLUser.photoURL, context),
    };
    expect(result).toStrictEqual(expected);
  });
});

describe('register', () => {
  const creation: UserCreation = {
    username: 'username',
    name: 'name',
    photo: {} as Promise<FileUpload>
  };
  const photoURL = '/photo.png';

  const act = () => resolver.register(context, creation);
  const getThrownError = async () => {
    try {
      await act();
    } catch (e) {
      return e;
    }
  };

  beforeEach(() => {
    reset(MockUserValidators);
    when(MockUserDataSource.isUsernameTaken(anything())).thenResolve(false);
  });

  beforeAll(() => {
    when(MockUserDataSource.createUser(anything()))
      .thenResolve(mockGraphQLUser);
  });

  it('should throw an error if the username is invalid', async () => {
    // arrange
    const usernameError = 'Invalid username';
    when(MockUserValidators.validateUsername(anything()))
      .thenReturn(usernameError);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserValidators.validateUsername(creation.username)).once();
    expect(error.extensions.code).toBe('BAD_USER_INPUT');
    expect(error.extensions.username).toBe(usernameError);
  });

  it('should throw an error if the name is invalid', async () => {
    // arrange
    const nameError = 'Name is invalid';
    when(MockUserValidators.validateName(anything()))
      .thenReturn(nameError);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserValidators.validateName(creation.name ?? '')).once();
    expect(error.extensions.code).toBe('BAD_USER_INPUT');
    expect(error.extensions.name).toBe(nameError);
  });

  it('should throw an error if the username is taken', async () => {
    // arrange
    when(MockUserDataSource.isUsernameTaken(anything())).thenResolve(true);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserDataSource.isUsernameTaken(creation.username)).once();
    expect(error.extensions.code).toBe('USERNAME_TAKEN');
  });

  it('should not save photo if it is not sent', async () => {
    // arrange
    const noPhotoCreation = {
      ...creation,
      photo: undefined,
    };
    // act
    const result = await resolver.register(context, noPhotoCreation);
    // assert
    verify(MockFileUtils.saveProfilePhoto(anything())).never();
    expect(result).toStrictEqual({
      ...mockGraphQLUser,
      photoURL: resolver._completePhotoUrl(mockGraphQLUser.photoURL, context)
    });
  });

  it('should throw an error if the sent photo failed to save', async () => {
    // arrange
    when(MockFileUtils.saveProfilePhoto(anything()))
      .thenReject(new Error('Failed to save'));
    // act
    const error = await getThrownError();
    // assert
    expect(error.extensions.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should save photo if it is sent', async () => {
    // arrange
    when(MockFileUtils.saveProfilePhoto(anything()))
      .thenResolve(photoURL);
    // act
    await act();
    // assert
    verify(MockFileUtils.saveProfilePhoto(deepEqual({
      userID: userID,
      photo: creation.photo!,
    }))).once();
  });

  it('should create the user and return it if al goes well', async () => {
    // arrange
    when(MockFileUtils.saveProfilePhoto(anything()))
      .thenResolve(photoURL);
    // act
    const result = await act();
    // assert
    verify(MockUserDataSource.createUser(deepEqual({
      authUserID: userID,
      username: creation.username,
      name: creation.name ?? undefined,
      photoURL: photoURL,
    }))).once();
    expect(result).toStrictEqual({
      ...mockGraphQLUser,
      photoURL: resolver._completePhotoUrl(mockGraphQLUser.photoURL, context)
    });
  });
});

describe('updateUser', () => {
  const usernameError = 'YEP';
  const nameError = 'NOP';
  const photoURL = '/photo/url';
  const update: UserUpdate = {
    username: 'username',
    name: 'name name',
    photo: {} as Promise<FileUpload>
  };

  const act = () => resolver.updateUser(context, update);
  const getThrownError = async () => {
    try {
      await act();
    } catch (e) {
      return e;
    }
  };

  beforeEach(() => {
    reset(MockUserValidators);
    when(MockUserDataSource.isUsernameTaken(anything())).thenResolve(false);
    when(MockFileUtils.saveProfilePhoto(anything())).thenResolve(photoURL);
    when(MockUserDataSource.updateUser(anything())).thenResolve(mockGraphQLUser);
  });

  it('should throw input error if the username is invalid', async () => {
    // arrange
    when(MockUserValidators.validateUsername(anything()))
      .thenReturn(usernameError);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserValidators.validateUsername(update.username!)).once();
    expect(error.extensions.code).toBe('BAD_USER_INPUT');
    expect(error.extensions.username).toBe(usernameError);
  });

  it('should throw USERNAME_TAKEN error if the username is taken', async () => {
    // arrange
    when(MockUserDataSource.isUsernameTaken(anything()))
      .thenResolve(true);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserValidators.validateUsername(update.username!)).once();
    expect(error.extensions.code).toBe('USERNAME_TAKEN');
  });

  it('should should throw input error if the name is invalid', async () => {
    // arrange
    when(MockUserValidators.validateName(anything()))
      .thenReturn(nameError);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserValidators.validateName(update.name!)).once();
    expect(error.extensions.code).toBe('BAD_USER_INPUT');
    expect(error.extensions.name).toBe(nameError);
  });

  it('should should throw input error if the name is invalid', async () => {
    // arrange
    when(MockUserValidators.validateName(anything()))
      .thenReturn(nameError);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserValidators.validateName(update.name!)).once();
    expect(error.extensions.code).toBe('BAD_USER_INPUT');
    expect(error.extensions.name).toBe(nameError);
  });

  it('should not save photo if it is not sent', async () => {
    // arrange
    const noPhotoUpdate = {
      ...update,
      photo: undefined,
    };
    // act
    const result = await resolver.updateUser(context, noPhotoUpdate);
    // assert
    verify(MockFileUtils.saveProfilePhoto(anything())).never();
    expect(result).toStrictEqual({
      ...mockGraphQLUser,
      photoURL: resolver._completePhotoUrl(mockGraphQLUser.photoURL, context)
    });
  });

  it('should throw an error if the sent photo failed to save', async () => {
    // arrange
    when(MockFileUtils.saveProfilePhoto(anything()))
      .thenReject(new Error('Failed to save'));
    // act
    const error = await getThrownError();
    // assert
    expect(error.extensions.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should save photo if it is sent', async () => {
    // arrange
    when(MockFileUtils.saveProfilePhoto(anything()))
      .thenResolve(photoURL);
    // act
    await act();
    // assert
    verify(MockFileUtils.saveProfilePhoto(deepEqual({
      userID: userID,
      photo: update.photo!,
    }))).once();
  });

  it('should update the user and return it if al goes well', async () => {
    // arrange
    const up: UserUpdate = {
      ...update,
      deletePhoto: true,
    };
    // act
    const result = await resolver.updateUser(context, up);
    // assert
    verify(MockUserDataSource.updateUser(deepEqual({
      authUserID: userID,
      username: up.username,
      name: up.name,
      deleteName: !!up.deleteName,
      photoURL: undefined,
      deletePhoto: !!up.deletePhoto,
    }))).once();
    expect(result).toStrictEqual({
      ...mockGraphQLUser,
      photoURL: resolver._completePhotoUrl(mockGraphQLUser.photoURL, context)
    });
  });
});

describe('checkUsernameExistence', () => {
  it('should forward the call to userDS.isUsernameTaken()', function () {
    // arrange
    const promise = new Promise<boolean>(r => r(true));
    const username = 'userammmmmmmmeeeee';
    when(MockUserDataSource.isUsernameTaken(anything())).thenReturn(promise);
    // act
    const result = resolver.checkUsernameExistence(context, username);
    // assert
    expect(result).toBe(promise);
    verify(MockUserDataSource.isUsernameTaken(username)).once();
  });
});

describe('findUsers', () => {
  it('should forward the call to userDS.findUsers()', ()=> {
    // arrange
    const promise = new Promise<User[]>(r => r([mockGraphQLUser]));
    const searchQuery = 'search query';
    when(MockUserDataSource.findUsers(anything())).thenReturn(promise);
    // act
    const result = resolver.findUsers(context, searchQuery);
    // assert
    expect(result).toBe(promise);
    verify(MockUserDataSource.findUsers(searchQuery)).once();
  });
});