import {
  contractActiveWeekdays,
  isContractServiceDate,
  nextContractServiceDate,
} from './contract-service-date';

const contract = {
  validFrom: '2026-08-15',
  validUntil: '2028-01-10',
  shifts: [
    {
      name: 'MANHÃ',
      requiredArrivalTime: '07:50',
      vehicleCount: 2,
      vehicleCapacity: 25,
      activeWeekdays: [1, 2, 3, 4, 5],
    },
  ],
};

describe('contract service date', () => {
  it('moves a Saturday to the next active Monday', () => {
    expect(nextContractServiceDate(contract, '2026-08-15')).toBe('2026-08-17');
    expect(isContractServiceDate(contract, '2026-08-15')).toBe(false);
    expect(isContractServiceDate(contract, '2026-08-17')).toBe(true);
    expect(contractActiveWeekdays(contract)).toBe('Seg, Ter, Qua, Qui, Sex');
  });
});
