import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], resolve: { dedupe: ['react', 'react-dom', 'antd'] }, server: { port: 5174, proxy: { '/api': 'http://localhost:3000' }, fs: { allow: ['..'] } } });
