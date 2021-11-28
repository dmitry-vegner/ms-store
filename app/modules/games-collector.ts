import {GamesResponse, IdsResponse, Product} from 'app/types/requests.js';
import fetch from 'node-fetch';

import {Game, ScoresMap} from '../types/entities.js';
import currencyConverter from './currency-converter.js';
import fm from './file-manager.js';

/*
const templateIds: string[] = [
  '9NBLGGH537BL', 'BQ2NNLQPS8RS', 'BSLX1RNXR6H7', 'BW85KQB8Q31M',
  '9N6Z8DQXSQWH', '9PGPQK0XTHRZ', '9NJRX71M5X9P', 'C1KX6KNB7XMM',
  'BWMH951M3G3P', 'C01Z9J8S9BJP', '9P3PL76N0KWZ', 'BNRH7BRC1D02'
];

const templateGames: Game[] = [
  { title: 'Minecraft', currency: 'ARS', price: 284 },
  { title: 'A Plague Tale: Innocence', currency: 'ARS', price: 1299 },
  { title: 'Batman™: Arkham Knight', currency: 'ARS', price: 219.8 },
  {
    title: 'Ori and the Blind Forest: Definitive Edition',
    currency: 'ARS',
    price: 499
  },
  { title: 'Disneyland Adventures', currency: 'ARS', price: 113.6 },
  { title: 'Cuphead', currency: 'ARS', price: 284 },
  {
    title: 'NARUTO SHIPPUDEN™: Ultimate Ninja® STORM 4',
    currency: 'ARS',
    price: 239.5
  },
  { title: 'RESIDENT EVIL 2', currency: 'ARS', price: 492.6 },
  { title: 'Mortal Kombat X', currency: 'ARS', price: 274.75 },
  {
    title: 'RUSH: A Disney • PIXAR Adventure',
    currency: 'ARS',
    price: 113.6
  },
  {
    title: 'Plants vs. Zombies™ Garden Warfare 2',
    currency: 'ARS',
    price: 59.8
  }
];
*/

async function tryNTimes(callback: any, times = 5): Promise<boolean> {
  try {
    await callback();
    return true;
  } catch (e) {
    console.error(`try${times - 1}Times catch:`, e);
    return times > 0 ?
      await tryNTimes(callback, times - 1) :
      false;
  }
}

class GamesCollector {
  market: string;
  gameIds: string[];
  games: Game[];
  gameScores: ScoresMap = {};

  constructor(market = 'AR') {
    this.market = market;
    this.gameIds = fm.readData(`gamesIds/${this.market}`) || [];
    this.games = fm.readData(`games/${this.market}`) || [];
    this.gameScores = {};
  }

  async init(): Promise<void> {
    if ([this.gameIds.length, this.games.length].includes(0)) {
      await this.refreshOffers();
    }
  }

  async refreshOffers(): Promise<void> {
    console.debug('refreshOffers() called for ', this.market);
    // console.debug('collectGameIds: Before');
    this.gameIds = await this.collectGameIds();
    // console.debug('collectGameIds: After');
    fm.writeData(`gamesIds/${this.market}`, this.gameIds);
    // console.debug('collectGameIds: Saved');

    // console.debug('collectGamesByIds: Before');
    this.games = await this.collectGamesByIds();
    // console.debug('collectGamesByIds: After');
    fm.writeData(`games/${this.market}`, this.games);
    // console.debug('collectGamesByIds: Saved');
    console.debug('refreshOffers() complete for ', this.market);
  }

  getOffers(): Game[] {
    return this.games;
  }

  getGameIds(): string[] {
    return this.gameIds;
  }

  getGameScores(): ScoresMap {
    return this.gameScores;
  }

  private async collectGameIds(category = 'Deal'): Promise<string[]> {
    const getUrl = (skip = 0, count = 200) => `https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/` +
      `${category}?Market=${this.market}&ItemTypes=Game&deviceFamily=Windows.Xbox&count=${count}&skipitems=${skip}`;

    const totalItesmResponse = await fetch(getUrl(0, 1)).then(resp => resp.json()) as IdsResponse;
    const totalItems = totalItesmResponse.PagingInfo.TotalItems || 2000;

    const idsPerRequest = 200;
    const requestsCount = Math.ceil(totalItems / 200);
    const requests = [];

    const mapIdsResponse = ({Items}: IdsResponse): string[] => Items.map(({Id, PredictedScore}) => {
      this.gameScores[Id] = PredictedScore;
      return Id;
    });

    for (let part = 0; part < requestsCount; part++) {
      const request: Promise<IdsResponse> = fetch(getUrl(part * idsPerRequest, idsPerRequest))
        .then(resp => resp.json()) as Promise<IdsResponse>;
      requests.push(request.then((res: IdsResponse): string[] => mapIdsResponse(res)));
    }

    return Promise.all(requests)
      .then((idsParts: string[][]): string[] => idsParts
        .reduce((allIds: string[], idsPart: string[]) => {
          idsPart.forEach((id: string) => allIds.push(id));
          return allIds;
        }, [])
      );
  }

  private splitByChunks(fullArray: Array<any>, chunkSize = 20) {
    const chunksCount = Math.ceil(fullArray.length / chunkSize);
    const chunkedArray = [];

    for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
      const startIndex = chunkIndex * chunkSize;
      const endIndex = startIndex + chunkSize;
      chunkedArray.push(fullArray.slice(startIndex, endIndex));
    }

    return chunkedArray;
  }

  private async collectGamesByIds(): Promise<Game[]> {
    const idsByChunks: string[][] = this.splitByChunks(this.gameIds);
    const reqUrls: string[] = idsByChunks.map(idsChunk => `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=` +
      `${idsChunk.join(',')}&market=${this.market}&languages=ru-ru`);

    // Количество одновременных запросов, которые сервер XBOX способен обработать
    const chunkSize = 15;
    const chunksCount = Math.ceil(reqUrls.length / chunkSize);
    const games: Game[] = [];

    for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
      const startIndex = chunkIndex * chunkSize;
      const endIndex = startIndex + chunkSize;
      const urlsChunk: string[] = reqUrls.slice(startIndex, endIndex);

      const reqs = urlsChunk.map(url => tryNTimes(async () => {
        const {Products} = await fetch(url).then(res => res.json()) as GamesResponse;
        Products?.forEach(({ProductId: id, LocalizedProperties: lang, DisplaySkuAvailabilities: market}: Product) => {
          const title = lang[0]?.ProductTitle || '';
          const price = market[0]?.Availabilities[0]?.OrderManagementData?.Price?.ListPrice || 0;
          const currency = market[0]?.Availabilities[0]?.OrderManagementData?.Price?.CurrencyCode || 'ARS';
          const convertedPrice = currencyConverter.getConvertedPrice(price, currency);

          if (title === '' || price === 0) {
            console.error('empty game with id', id);
            return;
          }

          games.push({
            id, title, currency, price, convertedPrice, score: this.gameScores[id] || 0, market: this.market,
          });
        });
      }));
      await Promise.all(reqs);
    }

    return games;
  }
}

export default GamesCollector;
