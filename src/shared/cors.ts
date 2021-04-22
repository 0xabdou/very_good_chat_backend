import {CorsOptions} from "cors";

const whitelist = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://chat.abdou.dev",
  'https://studio.apollographql.com',
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    //console.log('ORIGIN IS: ', origin);
    //// To be able to download schema in client project using intellij plugin
    //if (!origin) {
    //  callback(null, true);
    //  return;
    //}
    if (origin && whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      //// allow all for now
      //callback(null, true);
      //return;
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

export default corsOptions;