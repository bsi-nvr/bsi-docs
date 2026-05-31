import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeBlack from 'starlight-theme-black';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [
      starlight({
          title: 'Internal Docs',
          social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com' }],
          plugins: [
              starlightThemeBlack({}),
          ],
          sidebar: [
              {
                  label: 'Guides',
                  items: [
                      { label: 'Example Guide', slug: 'docs/guides/example' },
                  ],
              },
          ],
      }),
    ],

  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});