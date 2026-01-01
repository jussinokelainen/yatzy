let subTotal = 0;

export function updateSubTotal(value) {
  subTotal += value;
}

export function resetSubTotal() {
  subTotal = 0;
}

export { subTotal }


let total = 0;

export function updateTotal(value) {
  total += value;
}

export function resetTotal() {
  total = 0;
}

export { total }

export const perItemIndex = {
  one: 0,
  two: 1,
  three: 2,
  four: 3,
  five: 4,
  six: 5,
  pair: 6,
  doublepair: 7,
  triples: 8,
  quadruples: 9,
  smallstraight: 10,
  bigstraight: 11,
  fullhouse: 12,
  mixed: 13,
  quintuples: 14,
}
