import 'reflect-metadata';
import createApp from './app';
import container, {initContainer} from "./service-locator/container";
import TYPES from "./service-locator/types";

const bootstrap = async () => {
  await initContainer();
  return createApp(container.get(TYPES.ContextDataSources));
}

bootstrap().then(app => {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`
    🚀 Server is up and running.
    🎉 Listening on port ${port}.
  `);
  });
});

