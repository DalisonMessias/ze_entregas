import { enforceURLPolicy } from '../src/policy/urlPolicy';
import { test, expect } from 'vitest';

test('bloqueia chamadas explícitas para localhost', () => {
  expect(() => enforceURLPolicy('http://localhost:3001/api/test')).toThrow();
  expect(() => enforceURLPolicy('https://127.0.0.1:3000/auth')).toThrow();
});

test('permite caminhos relativos e URLs externas', () => {
  expect(() => enforceURLPolicy('/api/ok')).not.toThrow();
  expect(() => enforceURLPolicy('https://overpass-api.de/api')).not.toThrow();
});
