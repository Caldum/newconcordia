import { describe, expect, it } from 'vitest';

import { payslip } from './payslip';
import type { Job, Shift } from './queries';

const job = { wage: 4200, work_tax: 0.12 } as Job;

describe('payslip', () => {
  it('estimates the day before working', () => {
    expect(payslip(job, null)).toEqual({ gross: 4200, tax: 504, net: 3696, taxRate: 0.12 });
  });

  it('shows what was paid once worked', () => {
    const shift = { gross: 4000, tax: 480 } as Shift;
    expect(payslip(job, shift)).toEqual({ gross: 4000, tax: 480, net: 3520, taxRate: 0.12 });
  });

  it('is empty without a job', () => {
    expect(payslip(null, null)).toEqual({ gross: 0, tax: 0, net: 0, taxRate: 0 });
  });
});
