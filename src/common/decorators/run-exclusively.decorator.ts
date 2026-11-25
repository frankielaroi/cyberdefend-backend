import { CronLockService } from '../services/cron-lock.service';

/**
 * Wraps a scheduled method so only one app instance runs it at a time.
 * The class must inject CronLockService as `cronLock`. Place it directly under @Cron.
 *
 * ttlMs bounds how long a crashed instance can block the job; keep it below the cron interval.
 */
export function RunExclusively(lockName: string, ttlMs: number): MethodDecorator {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;

    const wrapped = async function (this: { cronLock?: CronLockService }, ...args: unknown[]) {
      if (!this.cronLock) {
        throw new Error(`@RunExclusively('${lockName}') requires CronLockService injected as "cronLock"`);
      }
      return this.cronLock.runExclusive(lockName, ttlMs, () => original.apply(this, args));
    };

    // Keep metadata already attached to the original (e.g. by decorators listed below this one)
    for (const key of Reflect.getMetadataKeys(original)) {
      Reflect.defineMetadata(key, Reflect.getMetadata(key, original), wrapped);
    }

    descriptor.value = wrapped;
    return descriptor;
  };
}
