import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Ventana de confirmación para acciones que no se pueden deshacer (por ejemplo, cancelar una
 * inscripción). La pantalla que la usa la muestra con `@if` y reacciona a sus dos eventos:
 * `confirmed` (con el motivo escrito, si se pidió uno) y `dismissed`.
 *
 * Es accesible: tiene rol de diálogo modal, enfoca el botón seguro («Volver») al abrirse y se
 * cierra con la tecla Escape o al pulsar fuera de la ventana.
 */
@Component({
  selector: 'app-confirm-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  host: { '(document:keydown.escape)': 'dismiss()' },
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Volver');
  /** Pinta el botón de confirmar en rojo (acciones destructivas). */
  readonly danger = input(false);
  /** Mientras es true la ventana no se puede cerrar ni confirmar otra vez (petición en curso). */
  readonly busy = input(false);
  /** Si se indica, la ventana pide un motivo opcional con esta etiqueta. */
  readonly reasonLabel = input<string | null>(null);
  readonly reasonMaxLength = input(500);

  readonly confirmed = output<string | undefined>();
  readonly dismissed = output<void>();

  protected readonly reason = new FormControl('', { nonNullable: true });
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  constructor() {
    afterNextRender(() => this.cancelButton()?.nativeElement.focus());
  }

  protected confirm(): void {
    if (this.busy()) {
      return;
    }
    const text = this.reason.value.trim();
    this.confirmed.emit(this.reasonLabel() && text ? text : undefined);
  }

  protected dismiss(): void {
    if (!this.busy()) {
      this.dismissed.emit();
    }
  }
}
