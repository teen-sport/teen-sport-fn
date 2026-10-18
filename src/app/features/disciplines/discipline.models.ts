/** Cuerpo de POST y PUT /disciplines. La disciplina (con su estado) es `Discipline`, del catálogo. */
export interface DisciplineRequest {
  name: string;
  description?: string;
  /** Mensualidad en pesos colombianos, mayor que 0 y con máximo dos decimales. */
  monthlyFee: number;
}
