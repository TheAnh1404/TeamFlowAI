import "server-only";

export type FeatureOwner = "TV1" | "TV2" | "TV3";

export class FeatureNotImplementedError extends Error {
  readonly code = "NOT_IMPLEMENTED";

  constructor(
    public readonly owner: FeatureOwner,
    public readonly capability: string,
  ) {
    super("Chức năng chưa được triển khai.");
    this.name = "FeatureNotImplementedError";
  }
}
