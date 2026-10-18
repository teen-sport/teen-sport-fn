/** Tipos de documento que ofrece la aplicación (el API acepta texto libre de hasta 10 caracteres). */
export const ID_TYPES = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'TI', label: 'Tarjeta de identidad' },
];

/** Nombre legible de un tipo de documento; si no se conoce, devuelve el código tal cual. */
export function idTypeLabel(code: string): string {
  return ID_TYPES.find((type) => type.value === code)?.label ?? code;
}
