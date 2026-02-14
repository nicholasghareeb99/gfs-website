import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://ghareebfencingsolutions.com',
  output: 'server',
  adapter: netlify(),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin/'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    })
  ],
  build: {
    format: 'directory'
  },
  vite: {
    build: {
      cssMinify: true,
      minify: true
    }
  }
});
