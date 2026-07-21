import { StructuredToolInterface } from '@langchain/core/tools';

export interface ToolBuildContext {
  /** The end-user's own Authorization header, forwarded as-is to the tenant's API so all of its existing auth/ownership checks apply unchanged. */
  authHeader: string;
}

/** Marks which of a manifest's tools mutate real data and therefore must go through the confirm-before-execute flow. */
export interface AgentTool {
  tool: StructuredToolInterface;
  requiresConfirmation: boolean;
}

/**
 * Describes one business/app this agent can act on behalf of. Onboarding a new tenant is
 * "write one of these", not "modify the agent" — the agent core has zero tenant-specific code.
 */
export interface TenantManifest {
  id: string;
  /** Persian description of the domain, folded into the agent's system prompt. */
  domainPrompt: string;
  buildTools(ctx: ToolBuildContext): AgentTool[];
}
