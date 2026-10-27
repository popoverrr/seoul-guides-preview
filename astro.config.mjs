// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Site URL is TODO(client) until the domain is chosen (Q8).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://seoul-notes.example',
  // GitHub Pages preview lives under /<repo>/ (BASE set by the workflow); production is the domain root
  base: process.env.BASE ?? '/',
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
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
    server: { proxy: { '/api': 'http://localhost:8080' } },
    build: { assetsInlineLimit: 1024 },
  },
});
