import "server-only";
import { FeatureNotImplementedError } from "@/server/http/feature-not-implemented-error";
import type { AuthorizationProvider, SessionProvider } from "./contracts";

// Fail closed: no fake identity, demo session, cookies, role or permission grant.
export const sessionProvider: SessionProvider = {
  async getCurrentSession() {
    throw new FeatureNotImplementedError("TV2", "auth.getCurrentSession");
  },
};

export const authorizationProvider: AuthorizationProvider = {
  async assertProjectMember() { throw new FeatureNotImplementedError("TV2", "auth.assertProjectMember"); },
  async assertTaskUpdateAllowed() { throw new FeatureNotImplementedError("TV2", "auth.assertTaskUpdateAllowed"); },
  async assertPlanPublishAllowed() { throw new FeatureNotImplementedError("TV2", "auth.assertPlanPublishAllowed"); },
  async assertAcceptanceAllowed() { throw new FeatureNotImplementedError("TV2", "auth.assertAcceptanceAllowed"); },
  async assertReportGenerationAllowed() { throw new FeatureNotImplementedError("TV2", "auth.assertReportGenerationAllowed"); },
};
