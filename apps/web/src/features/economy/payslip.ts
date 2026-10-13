import type { Job, Shift } from './queries';

export interface Payslip {
  /** Hundredths. */
  gross: number;
  tax: number;
  net: number;
  /** Work tax rate, 0.12 for 12 %. */
  taxRate: number;
}

/** Today's payslip: what the regular shift paid once worked, or what the job would pay before. */
export function payslip(job: Job | null, shift: Shift | null): Payslip {
  const taxRate = job?.work_tax ?? 0;
  const gross = shift?.gross ?? job?.wage ?? 0;
  const tax = shift?.tax ?? Math.round(gross * taxRate);
  return { gross, tax, net: gross - tax, taxRate };
}
