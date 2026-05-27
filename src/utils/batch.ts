export function splitImageBatch(total: number): number[] {
  const out: number[] = [];
  let rest = Math.max(1, total);
  while (rest > 0) {
    const n = Math.min(4, rest);
    out.push(n);
    rest -= n;
  }
  return out;
}
