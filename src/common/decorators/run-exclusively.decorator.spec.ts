import { Cron } from '@nestjs/schedule';
import { RunExclusively } from './run-exclusively.decorator';

describe('RunExclusively', () => {
  class Job {
    calls = 0;
    constructor(public cronLock?: any) {}

    @Cron('* * * * *')
    @RunExclusively('test-job', 1000)
    async run(value: number) {
      this.calls++;
      return value * 2;
    }
  }

  it('runs the method through the lock', async () => {
    const lock = { runExclusive: jest.fn((_name, _ttl, fn) => fn()) };
    const job = new Job(lock);

    await expect(job.run(21)).resolves.toBe(42);
    expect(lock.runExclusive).toHaveBeenCalledWith('test-job', 1000, expect.any(Function));
    expect(job.calls).toBe(1);
  });

  it('skips the method when another instance holds the lock', async () => {
    const job = new Job({ runExclusive: jest.fn().mockResolvedValue(undefined) });

    await expect(job.run(1)).resolves.toBeUndefined();
    expect(job.calls).toBe(0);
  });

  it('keeps the @Cron metadata so the scheduler still registers the job', () => {
    const keys = Reflect.getMetadataKeys(Job.prototype.run);
    expect(keys.length).toBeGreaterThan(0);
  });

  it('fails loudly when the lock service was not injected', async () => {
    await expect(new Job().run(1)).rejects.toThrow(/requires CronLockService/);
  });
});
