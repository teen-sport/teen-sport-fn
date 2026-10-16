import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

@Component({
  imports: [ConfirmDialog],
  template: `<app-confirm-dialog
    title="¿Cancelar la inscripción?"
    message="No se puede deshacer."
    confirmLabel="Sí, cancelar"
    [danger]="true"
    [busy]="busy"
    [reasonLabel]="reasonLabel"
    (confirmed)="confirmed.push($event)"
    (dismissed)="dismissed = dismissed + 1"
  />`,
})
class Host {
  busy = false;
  reasonLabel: string | null = null;
  confirmed: (string | undefined)[] = [];
  dismissed = 0;
}

describe('ConfirmDialog', () => {
  async function render(setup: (host: Host) => void = () => undefined) {
    TestBed.configureTestingModule({ imports: [Host] });
    const fixture = TestBed.createComponent(Host);
    setup(fixture.componentInstance);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      host: fixture.componentInstance,
      fixture,
      el,
      confirmButton: () => el.querySelector<HTMLButtonElement>('.actions button:first-child')!,
      cancelButton: () => el.querySelector<HTMLButtonElement>('.actions button:last-child')!,
    };
  }

  it('is a modal dialog with its title and message', async () => {
    const { el } = await render();
    const dialog = el.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('h2')?.textContent).toContain('¿Cancelar la inscripción?');
    expect(dialog.textContent).toContain('No se puede deshacer.');
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-title');
  });

  it('puts the focus on the safe button when it opens', async () => {
    const { cancelButton } = await render();
    expect(document.activeElement).toBe(cancelButton());
  });

  it('emits confirmed without a reason when none is asked for', async () => {
    const { host, confirmButton } = await render();
    confirmButton().click();
    expect(host.confirmed).toEqual([undefined]);
  });

  it('asks for an optional reason and emits it trimmed', async () => {
    const { host, fixture, el, confirmButton } = await render((h) => (h.reasonLabel = 'Motivo'));
    const reason = el.querySelector<HTMLTextAreaElement>('#confirm-reason')!;
    expect(el.querySelector('label[for="confirm-reason"]')?.textContent).toContain('Motivo');
    reason.value = '  Cambio de horario ';
    reason.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    confirmButton().click();
    expect(host.confirmed).toEqual(['Cambio de horario']);
  });

  it('emits undefined when the reason is left blank', async () => {
    const { host, confirmButton } = await render((h) => (h.reasonLabel = 'Motivo'));
    confirmButton().click();
    expect(host.confirmed).toEqual([undefined]);
  });

  it('is dismissed with the back button, the backdrop and Escape', async () => {
    const { host, el, cancelButton } = await render();
    cancelButton().click();
    el.querySelector<HTMLElement>('.backdrop')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.dismissed).toBe(3);
  });

  it('does not close when the click is inside the window', async () => {
    const { host, el } = await render();
    el.querySelector<HTMLElement>('.dialog')!.click();
    expect(host.dismissed).toBe(0);
  });

  it('ignores everything while a request is in progress', async () => {
    const { host, confirmButton, cancelButton } = await render((h) => (h.busy = true));
    expect(confirmButton().disabled).toBe(true);
    expect(cancelButton().disabled).toBe(true);
    expect(confirmButton().textContent).toContain('Procesando');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.dismissed).toBe(0);
    expect(host.confirmed).toEqual([]);
  });
});
