/**
 * Base para value objects con igualdad estructural.
 *
 * Cada value object debe declarar sus componentes de igualdad mediante
 * `getEqualityComponents`. La clase base provee `equals` que compara dichos
 * componentes en orden y por valor.
 */
export abstract class ValueObject {
  protected abstract getEqualityComponents(): ReadonlyArray<unknown>;

  equals(other: ValueObject | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (Object.getPrototypeOf(this) !== Object.getPrototypeOf(other)) {
      return false;
    }
    const a = this.getEqualityComponents();
    const b = other.getEqualityComponents();
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
}
