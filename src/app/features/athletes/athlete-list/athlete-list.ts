import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { Page } from '../../../Core/Models/page';
import { Pagination } from '../../../shared/pagination/pagination';
import { idTypeLabel } from '../../../shared/id-types';
import { formatDate } from '../../../shared/format';
import { Athlete } from '../athlete.models';
import { AthleteService } from '../athlete.service';

const PAGE_SIZE = 10;

/** «Mis deportistas»: lista paginada con búsqueda. Desde aquí se registra y se edita. */
@Component({
  selector: 'app-athlete-list',
  imports: [ReactiveFormsModule, RouterLink, Pagination],
  templateUrl: './athlete-list.html',
  host: { class: 'page-wide' },
})
export class AthleteList {
  private readonly service = inject(AthleteService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly result = signal<Page<Athlete> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = this.noticeFor();
  protected readonly idTypeLabel = idTypeLabel;
  protected readonly formatDate = formatDate;

  /** Texto y página que se están mostrando (la búsqueda se aplica al pulsar «Buscar»). */
  private term = '';
  private page = 0;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.list({ page: this.page, size: PAGE_SIZE, q: this.term }).subscribe({
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

  protected applySearch(): void {
    this.term = this.search.value.trim();
    this.page = 0;
    this.load();
  }

  protected clearSearch(): void {
    this.search.setValue('');
    this.applySearch();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  protected get searching(): boolean {
    return this.term !== '';
  }

  private noticeFor(): string | null {
    const saved = this.query.get('saved');
    if (saved === 'created') {
      return 'Deportista registrado. Ya puedes solicitar su inscripción en «Grupos disponibles».';
    }
    if (saved === 'updated') {
      return 'Los datos del deportista se actualizaron.';
    }
    return null;
  }
}
