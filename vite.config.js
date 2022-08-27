import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// const crossOriginIsolation = () => ({
//   name: 'configure-server',

//   configureServer(server) {
//     server.middlewares.use((_req, res, next) => {
//       res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
//       res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
//       next();
//     });
//   },
// });

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
