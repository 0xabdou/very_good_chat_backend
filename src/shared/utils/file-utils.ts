import {FileUpload} from "graphql-upload";
import {createWriteStream} from "fs";
import {injectable} from "inversify";

export type SaveProfilePhotoArgs = {
  userID: string,
  photo: Promise<FileUpload>,
}

@injectable()
export default class FileUtils {
  private readonly _storageDir: string;

  constructor(storageDir: string) {
    console.log('StorageDir: ', storageDir);
    this._storageDir = storageDir;
  }

  async saveProfilePhoto(args: SaveProfilePhotoArgs): Promise<string> {
    const {createReadStream, mimetype} = await args.photo;
    const photoType = mimetype.split('/')[1];
    const photoPath = `${args.userID}_pp.${photoType}`;
    const writeableStream = createWriteStream(
      `${this._storageDir}/${photoPath}`,
      {autoClose: true}
    );
    const saved = await new Promise<boolean>(resolve => {
      createReadStream()
        .pipe(writeableStream)
        .on('finish', () => resolve(true))
        .on('error', () => resolve(false));
    });
    if (!saved) throw new Error("Could not save photo");
    return photoPath;
  }
}