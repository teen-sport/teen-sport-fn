import { Component, computed, input, output } from '@angular/core';

/** Controles «Anterior / Siguiente» para los listados paginados (las páginas empiezan en 0). */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  /** Página actual, desde 0, tal como la devuelve el API. */
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input<number>(0);
  readonly pageChange = output<number>();

  protected readonly hasPrevious = computed(() => this.page() > 0);
  protected readonly hasNext = computed(() => this.page() + 1 < this.totalPages());

  protected go(target: number): void {
    this.pageChange.emit(target);
  }
}
