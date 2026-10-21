import { defineConfig } from 'vitest/config';

/** Тесты Firestore Rules — запускаются против эмулятора: npm run test:rules (нужна Java). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
