import { FormControl, FormGroup } from '@angular/forms';
import { checkPassword, maxUtf8Bytes, notBlank, sameValue, strongPassword } from './validators';

describe('password policy', () => {
  it('accepts a password with every rule', () => {
    expect(Object.values(checkPassword('Entrena#2026')).every(Boolean)).toBe(true);
    expect(strongPassword(new FormControl('Entrena#2026'))).toBeNull();
  });

  it.each([
    ['Ab1#', 'length'],
    ['entrena#2026', 'uppercase'],
    ['ENTRENA#2026', 'lowercase'],
    ['Entrena####', 'digit'],
    ['Entrena2026', 'symbol'],
  ] as const)('reports the missing rule for %s', (password, rule) => {
    expect(checkPassword(password)[rule]).toBe(false);
    expect(strongPassword(new FormControl(password))).toEqual({ weakpassword: true });
  });

  it('does not count spaces as symbols', () => {
    expect(checkPassword('Entrena 2026').symbol).toBe(false);
  });

  it('counts bytes, not characters, against the 72 limit', () => {
    const tooManyBytes = 'Añ1#'.repeat(20); // 80 characters, 100 bytes
    expect(checkPassword(tooManyBytes).length).toBe(false);
    expect(maxUtf8Bytes(72)(new FormControl(tooManyBytes))).toEqual({ maxbytes: { max: 72 } });
    expect(maxUtf8Bytes(72)(new FormControl('a'.repeat(72)))).toBeNull();
  });
});

describe('sameValue', () => {
  it('fails when the two values differ', () => {
    const group = new FormGroup(
      { a: new FormControl('x'), b: new FormControl('y') },
      { validators: [sameValue('a', 'b')] },
    );
    expect(group.errors).toEqual({ mismatch: true });
    group.controls.b.setValue('x');
    expect(group.errors).toBeNull();
  });
});

describe('notBlank', () => {
  it('rejects values made only of spaces', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ required: true });
    expect(notBlank(new FormControl(' Ana '))).toBeNull();
  });
});
