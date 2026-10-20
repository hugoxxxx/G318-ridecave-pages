export class RouteWorker {
  private worker = new Worker(new URL("./route.worker.ts", import.meta.url), {
    type: "module",
  });
  private nextId = 0;
  private pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: Error) => void }
  >();
  constructor() {
    this.worker.onmessage = ({ data }) => {
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      data.ok ? p.resolve(data.result) : p.reject(new Error(data.error));
    };
    this.worker.onerror = () => {
      for (const p of this.pending.values())
        p.reject(new Error("路线计算遇到问题，请刷新页面重试。"));
      this.pending.clear();
    };
  }
  request<T>(
    action: "load" | "match" | "slice",
    payload: unknown,
    transfer: Transferable[] = [],
  ): Promise<T> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, action, payload }, transfer);
    });
  }
}
