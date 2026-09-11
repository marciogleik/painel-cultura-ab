/** Regra de `register` para campos numéricos opcionais: '' vira null (uuid/int/numeric não aceitam ''). */
export const asNumberOrNull = {
  setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v)),
}
