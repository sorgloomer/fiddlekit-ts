export type Context = {

};

const max = (a: bigint, b: bigint): bigint => a > b ? a : b;
const min = (a: bigint, b: bigint): bigint => a < b ? a : b;

export class BigDecimal {
  private constructor(
    public readonly base: bigint,
    public readonly scale: bigint,
    public readonly rounding: Context,
  ) {}
}

export const add = (a: BigDecimal, b: BigDecimal) => {
  let xsm: BigDecimal;
  let xlg: BigDecimal;
  if (a.scale < b.scale) {
    xsm = a;
    xlg = b;
  } else {
    xsm = b;
    xlg = a;
  }



};
