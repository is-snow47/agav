import { loadRegistry, saveRegistry, acquireRegistryLock } from "./agent-registry.js";
import type { AgentDefinition } from "./types.js";

export async function checkA2AExecutionApproval(
  agent: AgentDefinition,
  confirmTool?: (toolName: string, input: Record<string, unknown>, diff?: any[]) => Promise<any>
): Promise<boolean> {
  const key = agent.alias || agent.manifest.name;

  const registry = await loadRegistry();
  const entry = registry.agents[key];
  if (entry?.approvedExecution) {
    return true;
  }

  if (!confirmTool) {
    console.error(`[a2a-approval] Agent ${key} requires execution approval but confirmTool is unavailable.`);
    return false;
  }

  const startCommand = agent.manifest["start-command"] || "unknown command";
  const choice = await confirmTool(
    `A2A Process Execution: ${key}`,
    { "start-command": startCommand }
  );

  if (choice === "yes" || choice === "always") {
    if (choice === "always") {
      const release = await acquireRegistryLock();
      try {
        const reg = await loadRegistry();
        if (reg.agents[key]) {
          reg.agents[key].approvedExecution = true;
          await saveRegistry(reg);
        }
      } finally {
        release();
      }
    }
    return true;
  }

  return false;
}
