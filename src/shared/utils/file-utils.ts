import {FileUpload} from "graphql-upload";
import * as fs from "fs";
import {createWriteStream} from "fs";
import {injectable} from "inversify";
import {v4} from 'uuid';

@injectable()
export default class FileUtils {
  private readonly _storageDir: string;

  constructor(storageDir: string) {
    console.log('StorageDir: ', storageDir);
    this._storageDir = storageDir;
  }

  async saveTempFile(photo: Promise<FileUpload>): Promise<string> {
    const {createReadStream, mimetype} = await photo;
    const ext = mimetype.split('/')[1];
    const name = v4();
    const photoPath = `${name}.${ext}`;
    const filePath = `${this._storageDir}/${photoPath}`;
    const writeableStream = createWriteStream(filePath, {autoClose: true});
    const saved = await new Promise<boolean>(resolve => {
      createReadStream()
        .pipe(writeableStream)
        .on('finish', () => resolve(true))
        .on('error', () => resolve(false));
    });
    if (!saved) throw new Error("Could not save photo");
    return filePath;
  }

  async deleteTempFile(path: string) {
    fs.unlinkSync(path);
  }
}