import userValidators from "../../../../src/features/user/graphql/validators";

describe('validateUsername', () => {

  const assert = (username: string) => {
    // act
    const error = userValidators.validateUsername(username);
    // assert
    expect(error).toBeTruthy();
  }

  it('should return an error if the username is empty',() => {
    assert('');
  });

  it('should return an error if the username starts with a dot',() => {
    assert('.username');
  });

  it('should return an error if the username ends with a dot',() => {
    assert('username.');
  });

  it('should return an error if the username has 2 consecutive dots',() => {
    assert('user..name');
  });

  it('should return an error if the username is less than 4 characters',() => {
    assert('use');
  });

  it('should return an error if the username is longer than 4 characters',() => {
    assert('abcdefghijklmnoprstuv');
  });

  it('should return an error if the username has a forbidden character',() => {
    assert('user&name');
  });

  it('should return undefined if the username is fine', () => {
    // act
    const error = userValidators.validateUsername('username');
    // assert
    expect(error).toBeUndefined();
  });
})

describe('validateName', () => {
  it('should return an error if the name is too long', () => {
    // arrange
    const name = 'abababababababababababababababababababababababababa';
    // act
    const error = userValidators.validateName(name);
    // assert
    expect(error).toBeTruthy();
  });

  it('should return undefined if the name is find', () => {
    // arrange
    const name = 'abababababababababababababababbabababababababababa';
    // act
    const error = userValidators.validateName(name);
    // assert
    expect(error).toBeUndefined();
  });
})