import { CURRENCY, formatMoney, parseAmount } from '../money';

describe('formatting money', () => {
  it.each([
    [0, `${CURRENCY}0.00`],
    [50, `${CURRENCY}50.00`],
    [12.5, `${CURRENCY}12.50`],
    [12.345, `${CURRENCY}12.35`],
    [1234.5, `${CURRENCY}1,234.50`],
    [1000, `${CURRENCY}1,000.00`],
    [1234567.89, `${CURRENCY}1,234,567.89`],
    [-250.75, `-${CURRENCY}250.75`],
  ])('renders %p as %s', (amount, expected) => {
    expect(formatMoney(amount)).toBe(expected);
  });

  it('never renders NaN or Infinity at the user', () => {
    expect(formatMoney(NaN)).toBe(`${CURRENCY}0.00`);
    expect(formatMoney(Infinity)).toBe(`${CURRENCY}0.00`);
  });
});

describe('reading a typed amount', () => {
  it.each([
    ['50', 50],
    ['12.50', 12.5],
    ['1,234.50', 1234.5],
    ['  75 ', 75],
    ['10.999', 11],
  ])('reads %s as %p', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', '0', '-5', 'abc', '12abc'])('refuses %p', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe('running balances', () => {
  it('does not drift over many operations', () => {
    let balance = 0;
    for (let i = 0; i < 1000; i++) balance += parseAmount('0.10')!;
    expect(formatMoney(balance)).toBe(`${CURRENCY}100.00`);
  });

  it('subtracts spending from income exactly', () => {
    const income = ['500', '250.50'].reduce((sum, v) => sum + parseAmount(v)!, 0);
    const spent = ['19.99', '45.25', '120'].reduce((sum, v) => sum + parseAmount(v)!, 0);
    expect(formatMoney(income - spent)).toBe(`${CURRENCY}565.26`);
  });
});
