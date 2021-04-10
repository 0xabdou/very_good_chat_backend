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
import {
  mockGraphQLUser,
  mockMe,
  mockResizedPhotos
} from "../../../mock-objects";
import {
  UserCreation,
  UserUpdate
} from "../../../../src/features/user/graphql/types";
import {FileUpload} from "graphql-upload";
import BlockDataSource
  from "../../../../src/features/block/data/block-data-source";

const MockUserDS = mock<UserDataSource>();
const MockBlockDS = mock<BlockDataSource>();
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
      userDS: instance(MockUserDS),
      blockDS: instance(MockBlockDS),
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
  resetCalls(MockUserDS);
  resetCalls(MockUserValidators);
  resetCalls(MockFileUtils);
});

describe('me', () => {
  it('should throw an error if the user is not found', async () => {
    // arrange
    when(MockUserDS.getMe(anything())).thenResolve(null);
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
    verify(MockUserDS.getMe(userID)).once();
  });

  it('should return the me object if it exists', async () => {
    // arrange
    when(MockUserDS.getMe(anything())).thenResolve(mockMe);
    // act
    const result = await resolver.me(context);
    // assert
    expect(result).toStrictEqual(mockMe);
    verify(MockUserDS.getMe(userID)).once();
  });
});

describe('register', () => {
  const creation: UserCreation = {
    username: 'username',
    name: 'name',
    photo: {} as Promise<FileUpload>
  };

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
    when(MockUserDS.isUsernameTaken(anything())).thenResolve(false);
  });

  beforeAll(() => {
    when(MockUserDS.createUser(anything()))
      .thenResolve(mockMe);
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
    when(MockUserDS.isUsernameTaken(anything())).thenResolve(true);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserDS.isUsernameTaken(creation.username)).once();
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
    verify(MockFileUtils.saveAvatar(anything(), anything())).never();
    expect(result).toStrictEqual(mockMe);
  });

  it('should throw an error if the sent photo failed to save', async () => {
    // arrange
    when(MockFileUtils.saveAvatar(anything(), anything()))
      .thenReject(new Error('Failed to save'));
    // act
    const error = await getThrownError();
    // assert
    expect(error.extensions.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should create the user and return it if al goes well', async () => {
    // arrange
    when(MockFileUtils.saveAvatar(anything(), anything()))
      .thenResolve(mockResizedPhotos);
    // act
    const result = await act();
    // assert
    verify(MockUserDS.createUser(deepEqual({
      authUserID: userID,
      username: creation.username,
      name: creation.name ?? undefined,
      photo: mockResizedPhotos
    }))).once();
    expect(result).toStrictEqual(mockMe);
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
    when(MockUserDS.isUsernameTaken(anything())).thenResolve(false);
    when(MockFileUtils.saveTempFile(anything())).thenResolve(photoURL);
    when(MockUserDS.updateUser(anything())).thenResolve(mockMe);
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
    when(MockUserDS.isUsernameTaken(anything()))
      .thenResolve(true);
    // act
    const error = await getThrownError();
    // assert
    verify(MockUserValidators.validateUsername(update.username!)).once();
    expect(error.extensions.code).toBe('USERNAME_TAKEN');
  });

  it('should throw input error if the name is invalid', async () => {
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

  it('should throw input error if the name is invalid', async () => {
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
    verify(MockFileUtils.saveAvatar(anything(), anything())).never();
    expect(result).toStrictEqual(mockMe);
  });

  it('should throw an error if the sent photo failed to save', async () => {
    // arrange
    when(MockFileUtils.saveAvatar(anything(), anything()))
      .thenReject(new Error('Failed to save'));
    // act
    const error = await getThrownError();
    // assert
    expect(error.extensions.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('should update the user and return it if al goes well', async () => {
    // arrange
    const up: UserUpdate = {
      ...update,
      deleteName: true,
    };
    when(MockFileUtils.saveAvatar(anything(), anything()))
      .thenResolve(mockResizedPhotos);
    // act
    const result = await resolver.updateUser(context, up);
    // assert
    expect(result).toStrictEqual(mockMe);
    verify(MockUserDS.updateUser(deepEqual({
      authUserID: userID,
      username: up.username,
      name: up.name,
      deleteName: !!up.deleteName,
      photo: mockResizedPhotos,
      deletePhoto: !!up.deletePhoto,
    }))).once();
  });
});

describe('updateActiveStatus', () => {
  it('should forward the call to userDS.updateActiveStatus', () => {
    // arrange
    const activeStatus = false;
    const promise = new Promise<boolean>(r => r(activeStatus));
    when(MockUserDS.updateActiveStatus(anything(), anything()))
      .thenReturn(promise);
    // act
    const result = resolver.updateActiveStatus(context, activeStatus);
    // assert
    expect(result).toBe(promise);
    verify(MockUserDS.updateActiveStatus(userID, activeStatus)).once();
  });
});

describe('updateLastSeen', () => {
  it('should forward the call to userDS.updateLastSeen', () => {
    // arrange
    const promise = new Promise<Date>(r => r(new Date()));
    when(MockUserDS.updateLastSeen(anything())).thenReturn(promise);
    // act
    const result = resolver.updateLastSeen(context);
    // assert
    expect(result).toBe(promise);
    verify(MockUserDS.updateLastSeen(userID)).once();
  });
});

describe('checkUsernameExistence', () => {
  it('should forward the call to userDS.isUsernameTaken()', function () {
    // arrange
    const promise = new Promise<boolean>(r => r(true));
    const username = 'userammmmmmmmeeeee';
    when(MockUserDS.isUsernameTaken(anything())).thenReturn(promise);
    // act
    const result = resolver.checkUsernameExistence(context, username);
    // assert
    expect(result).toBe(promise);
    verify(MockUserDS.isUsernameTaken(username)).once();
  });
});

describe('findUsers', () => {
  it('should return the found users excluding the blocking ones', async () => {
    // arrange
    const blockingIDs = ['blabla', 'haha'];
    when(MockBlockDS.getBlockingUserIDs(anything())).thenResolve(blockingIDs);
    const foundUsers = [mockGraphQLUser];
    when(MockUserDS.findUsers(anything(), anything())).thenResolve(foundUsers);
    const searchQuery = 'search query';
    // act
    const result = await resolver.findUsers(context, searchQuery);
    // assert
    expect(result).toStrictEqual(foundUsers);
    verify(MockUserDS.findUsers(searchQuery, blockingIDs)).once();
  });
});