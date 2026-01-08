/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,svelte}',
  ],
  important: "#risu-gca-container",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
