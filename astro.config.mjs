// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import http from 'node:http';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:8090'; // 8080 is taken by other local projects

// Site URL is TODO(client) until the domain is chosen (Q8).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://seoul-notes.example',
  // GitHub Pages preview lives under /<repo>/ (BASE set by the workflow); production is the domain root
  base: process.env.BASE ?? '/',
  output: 'static',
  devToolbar: { enabled: false },
  // 'always' for the built site; in dev it would answer /api/* with its own 404 before any proxy runs
  trailingSlash: process.argv.includes('dev') ? 'ignore' : 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'ru',
    locales: ['ru', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'viewport' },
  integrations: [
    preact(),
    sitemap({ filter: (page) => !/\/(account|admin|login|lab)\//.test(page) }),
  ],
  image: { responsiveStyles: false },
  vite: {
    // the reader routes on the client (docs/04 § 6): in dev every /account/guide/* serves the one shell, like Apache in prod
    plugins: [
      {
        name: 'reader-rewrite',
        enforce: 'pre', // ahead of Astro's own dev middleware (trailingSlash would 404 /api/*)
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // /api → the PHP dev server (`server.proxy` is not reached under astro dev 7, so forward by hand)
            if (req.url?.startsWith('/api/')) {
              const target = new URL(req.url, API_URL);
              const up = http.request(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (r) => {
                res.writeHead(r.statusCode ?? 502, r.headers);
                r.pipe(res);
              });
              up.on('error', () => {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end('{"error":{"code":"api_down","message":"API dev server is not running"}}');
              });
              req.pipe(up);
              return;
            }
            if (req.url && /^\/account\/guide\/[^?#]+/.test(req.url)) req.url = '/account/guide/';
            next();
          });
        },
      },
    ],
    build: { assetsInlineLimit: 1024 },
  },
});
