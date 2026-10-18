import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { Page } from '../../../Core/Models/page';
import { formatDate, formatMoney, formatPeriod } from '../../../shared/format';
import { Pagination } from '../../../shared/pagination/pagination';
import { Payment } from '../payment.models';
import { PaymentService } from '../payment.service';

const PAGE_SIZE = 10;

/**
 * Historial de pagos de toda la academia (E19, vista del administrador), con filtro por rango de
 * fechas. Cada fila lleva a la inscripción del pago, donde se pueden registrar más.
 */
@Component({
  selector: 'app-admin-payment-list',
  imports: [ReactiveFormsModule, RouterLink, Pagination],
  templateUrl: './admin-payment-list.html',
  host: { class: 'page-wide' },
})
export class AdminPaymentList {
  private readonly service = inject(PaymentService);

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly formatPeriod = formatPeriod;

  protected readonly filters = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });

  protected readonly result = signal<Page<Payment> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly rangeError = signal<string | null>(null);

  private page = 0;

  constructor() {
    this.load();
    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.page = 0;
      this.load();
    });
  }

  protected load(): void {
    const { from, to } = this.filters.getRawValue();
    // Las fechas «YYYY-MM-DD» se comparan como texto. Un rango al revés no se envía al servidor.
    if (from && to && from > to) {
      this.rangeError.set('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.rangeError.set(null);
    this.loading.set(true);
    this.loadError.set(null);
    this.service
      .list({ page: this.page, size: PAGE_SIZE, from: from || null, to: to || null })
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(toApiError(error).message);
          this.loading.set(false);
        },
      });
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected clearFilters(): void {
    this.filters.reset();
  }

  protected get filtering(): boolean {
    const { from, to } = this.filters.getRawValue();
    return !!(from || to);
  }
}
