export interface Game {
  id: string;
  title: string;
  isDlc: boolean;
  currency: string;
  price: number;
  convertedPrice: number;
  score: number;
  market: string;
}

export interface GamesMap {
  [gameId: string]: Game;
}

export interface MarketsMap {
  [marketId: string]: GamesMap;
}

export interface IdsByMarketsMap {
  [marketId: string]: string[];
}

export interface ScoresMap {
  [gameId: string]: number;
}

export interface CurrencyMap {
  [regionKey: string]: number;
}

export enum RuleType {
  AbsoluteRanges = 'absoluteRanges',
  RelativeRanges = 'relativeRanges',
  Absolute = 'absolute',
  Relative = 'relative',
};

export type SimpleFeeRule = number;
export type RangesFeeRule = {
  from: number;
  to: number;
  fee: number;
};

