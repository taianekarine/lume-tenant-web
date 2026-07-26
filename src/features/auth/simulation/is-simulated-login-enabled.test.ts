import { isSimulatedLoginEnabled } from './is-simulated-login-enabled';

describe('isSimulatedLoginEnabled', () => {
  it.each([
    {
      nodeEnvironment: 'development',
      simulationFlag: 'true',
      expectedResult: true,
    },
    {
      nodeEnvironment: 'test',
      simulationFlag: 'true',
      expectedResult: true,
    },
    {
      nodeEnvironment: 'development',
      simulationFlag: 'false',
      expectedResult: false,
    },
    {
      nodeEnvironment: 'development',
      simulationFlag: undefined,
      expectedResult: false,
    },
    {
      nodeEnvironment: 'production',
      simulationFlag: 'true',
      expectedResult: false,
    },
    {
      nodeEnvironment: 'production',
      simulationFlag: 'false',
      expectedResult: false,
    },
    {
      nodeEnvironment: 'production',
      simulationFlag: undefined,
      expectedResult: false,
    },
  ])(
    'returns $expectedResult for NODE_ENV=$nodeEnvironment and flag=$simulationFlag',
    ({ nodeEnvironment, simulationFlag, expectedResult }) => {
      expect(isSimulatedLoginEnabled(nodeEnvironment, simulationFlag)).toBe(expectedResult);
    },
  );
});
