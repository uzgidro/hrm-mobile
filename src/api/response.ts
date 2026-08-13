// List endpoints return either a bare array or a paginated `{ items: [...] }`
// envelope depending on the endpoint. Seven feature query files each declared
// their own identical copy of this unwrap (two of them typed `any` and one
// specialized to WorkLeave) — this is the single shared version.
//
// Pure by design: unit-tested directly, per the repo's RNTL-14 rule that pushes
// logic out of hooks and into testable functions.
export function unwrapList<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : ((data as { items?: T[] })?.items ?? [])) as T[];
}
