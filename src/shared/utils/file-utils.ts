import {FileUpload} from "graphql-upload";
import {createWriteStream, unlinkSync} from "fs";
import {dirname, join} from 'path';
import {injectable} from "inversify";
import sharp from 'sharp';
import {v4} from 'uuid';
import {MediaType} from "../../features/chat/graphql/types";
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

  static isImage(ext: string) {
    const exts = ['png', 'jpg', 'jpeg'];
    return exts.indexOf(ext) != -1;
  }

  async saveAvatar(file: Promise<FileUpload>, userID: string): Promise<ResizedPhotos> {
    const {createReadStream, mimetype} = await file;
    const ext = mimetype.split('/')[1];
    if (!FileUtils.isImage(ext)) throw new Error('The avatar should be an image');
    const name = v4();
    const dirPath = `${this._storageDir}/avatars/${userID}`;
    await fs.ensureDir(dirPath);
    const sourceAvatarPath = `${dirPath}/${name}.${ext}`;
    const writeableStream = createWriteStream(sourceAvatarPath, {autoClose: true});
    const saved = await new Promise<boolean>(resolve => {
      createReadStream()
        .pipe(writeableStream)
        .on('finish', () => resolve(true))
        .on('error', () => resolve(false));
    });
    if (!saved) throw new Error("Could not save file");
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

  getMediaType(url: string): MediaType {
    const imageExt = ['png', 'jpg', 'jpeg'];
    const ext = url.split('.')[-1];
    if (imageExt.indexOf(ext) != -1) return MediaType.IMAGE;
    if (ext == 'mp4') return MediaType.VIDEO;
    throw new Error('UNSUPPORTED_MEDIA_TYPE',);
  }

  async saveTempFile(file: Promise<FileUpload>): Promise<string> {
    const {createReadStream, mimetype} = await file;
    const ext = mimetype.split('/')[1];
    const name = v4();
    const filePath = `${this._storageDir}/${name}.${ext}`;
    const writeableStream = createWriteStream(filePath, {autoClose: true});
    const saved = await new Promise<boolean>(resolve => {
      createReadStream()
        .pipe(writeableStream)
        .on('finish', () => resolve(true))
        .on('error', () => resolve(false));
    });
    if (!saved) throw new Error("Could not save file");
    return filePath;
  }

  async generateResizedPhotos(photoPath: string): Promise<ResizedPhotos> {
    const fileName = photoPath.split('/').pop();
    const workingDir = dirname(photoPath);
    const sizes = [48, 150];

    const promises = sizes.map(async size => {
      const thumbName = `${size}_${fileName}`;
      const thumbPath = join(workingDir, thumbName);
      await sharp(photoPath).resize(size).toFile(thumbPath);
      return thumbPath;
    });
    const paths = await Promise.all(promises);
    return {
      source: photoPath,
      small: paths[0],
      medium: paths[1]
    } as ResizedPhotos;
  }

  async deleteTempFile(path: string) {
    unlinkSync(path);
  }
}

export type ResizedPhotos = {
  source: string,
  small: string,
  medium: string,
}