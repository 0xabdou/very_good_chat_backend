import {CorsOptions} from "cors";

const whitelist = [
  "http://localhost:3000",
  "http://localhost:5000",
  'https://studio.apollographql.com',
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // To be able to download schema in client project using intellij plugin
    console.log('ORIGIN IS: ', origin);
    if (!origin) {
      callback(null, true);
      return;
    }
    if (origin && whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

export default corsOptions;