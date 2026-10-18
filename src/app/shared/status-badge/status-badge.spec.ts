import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EnrollmentStatus, PaymentStatus } from '../../Core/Models/enrollment-status';
import { StatusBadge } from './status-badge';

@Component({
  imports: [StatusBadge],
  template: `<app-status-badge [kind]="kind" [value]="value" />`,
})
class Host {
  kind: 'enrollment' | 'payment' = 'enrollment';
  value: EnrollmentStatus | PaymentStatus = 'ACTIVE';
}

describe('StatusBadge', () => {
  async function render(
    kind: 'enrollment' | 'payment',
    value: EnrollmentStatus | PaymentStatus,
  ): Promise<HTMLElement> {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.kind = kind;
    fixture.componentInstance.value = value;
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('.badge') as HTMLElement;
  }

  it.each([
    ['enrollment', 'PENDING_REVIEW', 'En revisión', 'badge--warn'],
    ['enrollment', 'ACTIVE', 'Activa', 'badge--good'],
    ['enrollment', 'REJECTED', 'Rechazada', 'badge--bad'],
    ['enrollment', 'CANCELLED', 'Cancelada', 'badge--muted'],
    ['payment', 'UP_TO_DATE', 'Al día', 'badge--good'],
    ['payment', 'OVERDUE', 'Pago pendiente', 'badge--warn'],
  ] as const)('shows %s %s as «%s»', async (kind, value, label, tone) => {
    const badge = await render(kind, value);
    expect(badge.textContent?.trim()).toBe(label);
    expect(badge.classList).toContain(tone);
  });
});
