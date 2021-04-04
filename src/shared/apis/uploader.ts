import {Storage} from "@google-cloud/storage";
import {inject, injectable} from "inversify";
import TYPES from "../../service-locator/types";

export interface IUploader {
  uploadAvatar(args: UploadAvatarArgs): Promise<string>;

  uploadConversationMedia(args: UploadConversationMediaArgs): Promise<string>;
}

@injectable()
export default class Uploader implements IUploader {
  static readonly BASE_URL = 'https://storage.cloud.google.com';
  private readonly _storage: Storage;

  constructor(@inject(TYPES.Storage) storage: Storage) {
    this._storage = storage;
  }

  async uploadAvatar(args: UploadAvatarArgs): Promise<string> {
    const fileName = args.photoPath.split('/').pop();
    const destination = `${args.userID}/${fileName}`;
    const bucket = process.env.AVATARS_BUCKET!;
    await this._storage.bucket(bucket).upload(args.photoPath, {destination});
    return `${Uploader.BASE_URL}/${bucket}/${destination}`;
  }

  async uploadConversationMedia(args: UploadConversationMediaArgs): Promise<string> {
    const fileName = args.mediaPath.split('/').pop();
    const destination = `${args.conversationID}/${fileName}`;
    const bucket = process.env.CONVERSATIONS_BUCKET!;
    await this._storage.bucket(bucket).upload(args.mediaPath, {destination});
    return `${Uploader.BASE_URL}/${bucket}/${destination}`;
  }

}

export type UploadAvatarArgs = {
  photoPath: string,
  userID: string
}

export type UploadConversationMediaArgs = {
  conversationID: number,
  mediaPath: string,
}