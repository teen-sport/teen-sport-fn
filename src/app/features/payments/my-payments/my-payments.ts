import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { Page } from '../../../Core/Models/page';
import { formatDate, formatMoney, formatPeriod } from '../../../shared/format';
import { Pagination } from '../../../shared/pagination/pagination';
import { Payment } from '../payment.models';
import { PaymentService } from '../payment.service';

const PAGE_SIZE = 10;

/** «Mis pagos»: historial de los pagos que la academia registró para los deportistas del acudiente. */
@Component({
  selector: 'app-my-payments',
  imports: [RouterLink, Pagination],
  templateUrl: './my-payments.html',
  host: { class: 'page-wide' },
})
export class MyPayments {
  private readonly service = inject(PaymentService);

  protected readonly formatMoney = formatMoney;
  protected readonly formatPeriod = formatPeriod;
  protected readonly formatDate = formatDate;

  protected readonly result = signal<Page<Payment> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  private page = 0;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.list({ page: this.page, size: PAGE_SIZE }).subscribe({
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
}
