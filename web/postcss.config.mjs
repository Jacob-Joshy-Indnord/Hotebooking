/**
 * File: web/postcss.config.mjs
 *
 * PostCSS configuration for the RoomBook web UI. Next.js reads this file
 * automatically when it builds CSS. It registers one plugin,
 * @tailwindcss/postcss, which is how Tailwind CSS v4 runs. With that plugin
 * in place, src/app/globals.css only needs `@import "tailwindcss"` and the
 * utility classes used in components under src/ are generated at build time.
 * Unused utilities are left out of the output automatically, so no content
 * globs or tailwind.config file are needed.
 *
 * Exports: the default config object with a `plugins` map. It has no
 * functions. Vitest does not load this file because component tests do not
 * process CSS (css: false in vitest.config.mts).
 */
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
