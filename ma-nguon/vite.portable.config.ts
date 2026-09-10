import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:'portable',publicDir:'../public',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))}},build:{outDir:'../release/web',emptyOutDir:true},css:{postcss:{plugins:[tailwindcss()]}}});
