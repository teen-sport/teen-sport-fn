import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

@Component({
  imports: [Pagination],
  template: `<app-pagination
    [page]="page"
    [totalPages]="totalPages"
    (pageChange)="changed.push($event)"
  />`,
})
class Host {
  page = 0;
  totalPages = 3;
  changed: number[] = [];
}

describe('Pagination', () => {
  async function render(page: number, totalPages: number) {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.page = page;
    fixture.componentInstance.totalPages = totalPages;
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
    return { fixture, el, buttons, host: fixture.componentInstance };
  }

  it('is hidden when everything fits in one page', async () => {
    const { el } = await render(0, 1);
    expect(el.querySelector('nav')).toBeNull();
  });

  it('shows the 1-based page and disables «Anterior» on the first page', async () => {
    const { el, buttons } = await render(0, 3);
    expect(el.textContent).toContain('Página 1 de 3');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);
  });

  it('disables «Siguiente» on the last page', async () => {
    const { buttons } = await render(2, 3);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
  });

  it('emits the 0-based target page', async () => {
    const { buttons, host } = await render(1, 3);
    buttons[1].click();
    buttons[0].click();
    expect(host.changed).toEqual([2, 0]);
  });
});
