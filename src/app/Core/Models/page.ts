/** Página de resultados que devuelven todos los listados del API (empieza en la página 0). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
