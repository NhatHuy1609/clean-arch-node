import { randomUUID } from 'node:crypto';
import type { IdGenerator } from '../../application/ports/IdGenerator';

/** `node:crypto` only appears here — application may not import it (see the application-no-npm rule). */
export class RandomUuidGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}
