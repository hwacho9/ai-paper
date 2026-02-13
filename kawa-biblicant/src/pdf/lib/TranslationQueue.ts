import { AsyncQueue } from "./AsyncQueue";

type QueueTask = () => Promise<void>;

export class TranslationQueue {
  private readonly queue: AsyncQueue;
  private readonly pending = new Set<string>();

  constructor(maxConcurrent = 10) {
    this.queue = new AsyncQueue(maxConcurrent);
  }

  has(id: string) {
    return this.pending.has(id);
  }

  enqueue(id: string, task: QueueTask) {
    if (this.pending.has(id)) return Promise.resolve();
    this.pending.add(id);
    return this.queue.enqueue(async () => {
      try {
        await task();
      } finally {
        this.pending.delete(id);
      }
    });
  }

  clear() {
    this.queue.clear();
    this.pending.clear();
  }
}
