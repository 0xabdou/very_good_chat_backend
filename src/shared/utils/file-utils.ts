import {FileUpload} from "graphql-upload";
import {createWriteStream} from "fs";
import {join} from 'path';
import {injectable} from "inversify";
import sharp from 'sharp';
import {v4} from 'uuid';
import {Media, MediaType} from "../../features/chat/graphql/types";
import fs from 'fs-extra';

@injectable()
export default class FileUtils {
  private readonly _storageDir: string;
  private readonly _serverUrl = process.env.SERVER_URL;

  constructor(storageDir: string) {
    console.log('StorageDir: ', storageDir);
    console.log('ServerURL: ', this._serverUrl);
    this._storageDir = storageDir;
  }

  async saveUpload(file: Promise<FileUpload>, path: string) {
    const {createReadStream} = await file;
    return new Promise<void>((resolve, reject) => {
      const writeableStream = createWriteStream(path, {autoClose: true});
      createReadStream()
        .on('error', reject)
        .pipe(writeableStream)
        .on('finish', resolve);
    });
  }

  async saveAvatar(file: Promise<FileUpload>, userID: string): Promise<ResizedPhotos> {
    const {mimetype} = await file;
    const [type, ext] = mimetype.split('/');
    if (type != 'image') throw new Error('The avatar should be an image');
    const name = v4();
    const dirPath = `${this._storageDir}/avatars/${userID}`;
    await fs.ensureDir(dirPath);
    const sourceAvatarPath = `${dirPath}/${name}.${ext}`;
    await this.saveUpload(file, sourceAvatarPath);
    const sizes = [150, 48];
    const promises = sizes.map(async size => {
      const thumbName = `${name}_x${size}.${ext}`;
      const thumbPath = join(dirPath, thumbName);
      await sharp(sourceAvatarPath).resize(size).toFile(thumbPath);
      return thumbName;
    });
    const resizedPaths = await Promise.all(promises);
    const prefix = `${this._serverUrl}/avatars/${userID}/`;
    return {
      source: prefix + `${name}.${ext}`,
      medium: prefix + resizedPaths[0],
      small: prefix + resizedPaths[1],
    };
  }

  async saveConversationMedia(file: Promise<FileUpload>, convID: number): Promise<Media> {
    const {mimetype} = await file;
    const [type, ext] = mimetype.split('/');
    let mediaType: MediaType;
    if (type == 'image') mediaType = MediaType.IMAGE;
    else if (type == 'video') mediaType = MediaType.VIDEO;
    else throw new Error(`Unsupported media type: ${type}`);
    const uid = v4();
    const sourceName = `${uid}.${ext}`;
    const dirPath = `${this._storageDir}/conversations/${convID}`;
    await fs.ensureDir(dirPath);
    const sourceMediaPath = `${dirPath}/${sourceName}`;
    await this.saveUpload(file, sourceMediaPath);
    let thumbName: string | undefined;
    if (mediaType == MediaType.IMAGE && ext != "gif") {
      const {width, height} = await sharp(sourceMediaPath).metadata();
      const THRESHOLD = 500;
      if (!height || !width) throw new Error("Couldn't get file metadata");
      const ar = width / height;
      let thumbWidth, thumbHeight: number | undefined;
      if (width > height) {
        if (width > THRESHOLD) {
          thumbWidth = THRESHOLD;
          thumbHeight = THRESHOLD / ar;
        }
      } else {
        if (height > THRESHOLD) {
          thumbHeight = THRESHOLD;
          thumbWidth = THRESHOLD * ar;
        }
      }
      if (thumbWidth && thumbHeight) {
        thumbName = `${uid}_thumb.${ext}`;
        const thumbPath = join(dirPath, thumbName);
        await sharp(sourceMediaPath)
          .resize({
            width: Math.floor(thumbWidth),
            height: Math.floor(thumbHeight)
          })
          .toFile(thumbPath);
      } else {
        thumbName = sourceName;
      }
    } else if (ext == "gif") {
      thumbName = sourceName;
    }
    const prefix = `${this._serverUrl}/conversations/${convID}/`;
    return {
      url: prefix + sourceName,
      thumbUrl: thumbName ? prefix + thumbName : undefined,
      type: mediaType
    };
  }
}

export type ResizedPhotos = {
  source: string,
  small: string,
  medium: string,
}