export type PriceComparison = {
  previousPrice: number;
  currentPrice: number;
  difference: number;
  direction: 'higher' | 'lower' | 'same';
  previousDate: string;
};

export type PreviousPrice = {
  previousPrice: number;
  previousDate: string;
};
