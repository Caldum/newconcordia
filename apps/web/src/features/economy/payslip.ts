import type { Job, Workday } from './queries';

export interface Payslip {
  /** Hundredths. */
  gross: number;
  tax: number;
  net: number;
  /** Work tax rate, 0.12 for 12 %. */
  taxRate: number;
}

/** Today's payslip: what was paid once worked, or what the job would pay before working. */
export function payslip(job: Job | null, workday: Workday | null): Payslip {
  const taxRate = job?.work_tax ?? 0;
  const gross = workday?.gross ?? job?.wage ?? 0;
  const tax = workday?.tax ?? Math.round(gross * taxRate);
  return { gross, tax, net: gross - tax, taxRate };
}
