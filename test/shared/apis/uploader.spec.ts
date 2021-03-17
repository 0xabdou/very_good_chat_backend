import {anything, deepEqual, instance, mock, verify, when} from "ts-mockito";
import {Bucket, Storage, UploadResponse} from "@google-cloud/storage";
import Uploader from "../../../src/shared/apis/uploader";

const MockStorage = mock<Storage>();
const MockBucket = mock<Bucket>();
const uploader = new Uploader(instance(MockStorage));

beforeAll(() => {
  when(MockStorage.bucket(anything())).thenReturn(instance(MockBucket));
})

describe('uploadAvatar', () => {
  it('should upload the avatar', async () => {
    // arrange
    const res = {} as UploadResponse;
    const photoPath = 'avatar path';
    const userID = 'userIDDDD';
    when(MockBucket.upload(anything())).thenResolve(res);
    // act
    const result = await uploader.uploadAvatar({photoPath,userID});
    // assert
    const bucketName = process.env.AVATARS_BUCKET!;
    const destination = `${userID}/avatar.png`;
    verify(MockStorage.bucket(bucketName)).once();
    verify(MockBucket.upload(photoPath, deepEqual({destination}))).once();
    expect(result).toBe(`${Uploader.BASE_URL}/${bucketName}/${destination}`);
  });
})