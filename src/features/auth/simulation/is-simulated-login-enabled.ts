export function isSimulatedLoginEnabled(
  nodeEnvironment: string | undefined,
  simulationFlag: string | undefined,
): boolean {
  return nodeEnvironment !== 'production' && simulationFlag === 'true';
}
