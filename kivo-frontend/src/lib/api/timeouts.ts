/** Remote atomic writes include validation/audit round trips measured above 12s.
 * Give their response a bounded budget without retrying or changing server errors.
 * Reads and authentication keep the established short deadline.
 */
export function upstreamTimeoutMs(path: string, method: string): number {
  const write = method === "POST" || method === "PATCH";
  const financial =
    /^\/api\/v1\/(accounts|categories|transactions|contacts|loans|settlements|shared-bills|rent)\//.test(
      path
    );
  return write && financial ? 30_000 : 12_000;
}

export function clientTimeoutMs(path: string, method: string): number {
  const upstream = upstreamTimeoutMs(path, method);
  return upstream + (upstream === 30_000 ? 5_000 : 3_000);
}
