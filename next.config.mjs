import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default {
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
};
