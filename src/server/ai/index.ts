import "server-only";
import { FeatureNotImplementedError } from "@/server/http/feature-not-implemented-error";
import type { AiProvider } from "./contracts";

// TODO(TV3): implement provider, output validation and error handling later.
// No SDK, prompts, mock output or provider call in scaffold.
export const aiProvider: AiProvider = {
  async generate(kind) {
    throw new FeatureNotImplementedError("TV3", "ai." + kind);
  },
};
