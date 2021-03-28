export type UserValidators = {
  validateUsername: (username: string) => string | undefined,
  validateName: (name: string) => string | undefined,
};

const userValidators : UserValidators = {
  validateUsername(username: string) {
    if (username.length == 0) return 'A username is required';
    if (username[0] == '.' || username[username.length - 1] == '.')
      return "The username can't start or end with a dot";
    if (/\.{2,}/.test(username)) return "The username can't have 2 consecutive dots";
    if (username.length < 4) return 'Username must be 4 characters at least';
    if (username.length > 20) return 'Username must be 20 characters at most';
    if (!/^[a-z0-9._]+$/.test(username)) return 'Username can only contain letter, numbers, . and _';
  },
  validateName(name: string) {
    if (name.length > 20) return 'Name must be 50 characters at most';
  }
};

export default userValidators;
