declare const Bun: {
  env: Record<string, string | undefined>;
  file(path: string | URL): Blob & { exists(): Promise<boolean> };
  serve(options: {
    port: number;
    fetch(request: Request): Response | Promise<Response>;
  }): unknown;
};
