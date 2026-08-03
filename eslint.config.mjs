import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
// 새로 추가
import prettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// 새로 추가
	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		plugins: {
			prettier,
		},
		rules: {
			'prettier/prettier': ['error', { endOfLine: 'lf',},],
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
	// 새로 추가
	eslintConfigPrettier,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
	]),
]);
export default eslintConfig;
