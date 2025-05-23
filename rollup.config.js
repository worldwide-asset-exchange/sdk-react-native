import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from '@rollup/plugin-typescript';
import external from 'rollup-plugin-peer-deps-external';
import { terser } from 'rollup-plugin-terser';

const packageJson = require('./package.json');

/**
 * @type {import('rollup').RollupOptions}
 */
const config = [
  {
    external: ['react', 'react-dom', 'react-native'],
    input: './src/index.tsx',
    output: [
      {
        file: packageJson.module,
        inlineDynamicImports: true,
        format: 'esm',
        sourcemap: true,
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
          // Not sure why rollup otherwise adds an extra '../' to the path

          // Adjust the path transformation logic as needed
          return relativeSourcePath.replace(/^..\//, '');
        },
      },
      {
        file: packageJson.main,
        inlineDynamicImports: true,
        format: 'cjs',
        sourcemap: true,
        sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
          // Not sure why rollup otherwise adds an extra '../' to the path

          // Adjust the path transformation logic as needed
          return relativeSourcePath.replace(/^..\//, '');
        },
      },
    ],
    plugins: [
      external(),
      typescript({ tsconfig: './tsconfig.json' }),
      commonjs(),
      json(),
      terser(),
    ],
  },
];

export default config;
