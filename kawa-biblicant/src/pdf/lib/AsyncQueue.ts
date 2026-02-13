type Task = () => Promise<void>;

export class AsyncQueue {
  private active = 0;
  private readonly queue: Task[] = [];

  constructor(private readonly maxConcurrent: number) {}

  enqueue(task: Task) {
    return new Promise<void>((resolve) => {
      const run = async () => {
        this.active += 1;
        try {
          await task();
        } finally {
          this.active -= 1;
          this.pump();
          resolve();
        }
      };

      if (this.active < this.maxConcurrent) {
        void run();
      } else {
        this.queue.push(() => run());
      }
    });
  }

  clear() {
    this.queue.length = 0;
  }

  private pump() {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
