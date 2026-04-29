// Copyright (c) 2026 Chu Ling and LeapNuX Contributors
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false, // explicit imports, no implicit globals
    environment: 'node',
    include: ['test/**/*.test.mjs', 'src/**/*.test.mjs'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/**', 'test/**', '**/*.test.mjs', 'examples/**'],
    },
  },
});
