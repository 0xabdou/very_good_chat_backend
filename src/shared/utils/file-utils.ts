import {FileUpload} from "graphql-upload";
import {createWriteStream, unlinkSync} from "fs";
import {dirname, join} from 'path';
import {injectable} from "inversify";
import sharp from 'sharp';
import {v4} from 'uuid';

@injectable()
export default class FileUtils {
  private readonly _storageDir: string;

  constructor(storageDir: string) {
    console.log('StorageDir: ', storageDir);
    this._storageDir = storageDir;
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

  getConversationMediaTypesOrThrow() {

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