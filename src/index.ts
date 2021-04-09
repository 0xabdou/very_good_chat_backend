import 'reflect-metadata';
import createApp from './app';
import container, {initContainer} from "./service-locator/container";
import TYPES from "./service-locator/types";

const bootstrap = async () => {
  await initContainer();
  const [server, app] = await createApp(container.get(TYPES.ToolBox));
  const port = process.env.PORT || 4000;
  const expressServer = app.listen(port, () => {
    console.log(`
    🚀 Server is up and running.
    🎉 Listening on port ${port}.
  `);
  });
  server.installSubscriptionHandlers(expressServer);
};

void bootstrap();