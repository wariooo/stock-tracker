export function isAiAnalysisEnabled(): boolean {
  return process.env.ENABLE_AI_ANALYSIS === "true";
}
