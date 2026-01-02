import { describe, it, expect, beforeEach } from 'vitest';
import * as logger from '../logger';

describe('logger', () => {
  beforeEach(() => {
    logger.clear();
    logger.setConfig({ maxEntriesPerFile: 3, maxBytesPerFile: 1024, maxFiles: 2, level: 'DEBUG' });
  });

  it('formats entries as JSON lines with required fields', async () => {
    const txn = logger.withTxn();
    logger.error('test event', { a: 1 }, txn);
    await logger.flush();
    const files = logger.getFiles();
    const content = files[0].content.trim();
    const firstLine = content.split('\n')[0];
    const parsed = JSON.parse(firstLine);
    expect(parsed.ts).toBeTruthy();
    expect(parsed.level).toBe('ERROR');
    expect(parsed.message).toBe('test event');
    expect(parsed.context.a).toBe(1);
    expect(parsed.txn).toBe(txn);
  });

  it('rotates when exceeding max entries', async () => {
    logger.info('e1');
    logger.info('e2');
    logger.info('e3');
    logger.info('e4');
    await logger.flush();
    const files = logger.getFiles();
    expect(files[0].count).toBeGreaterThan(0);
  });
});
