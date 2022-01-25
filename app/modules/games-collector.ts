import {GamesResponse, IdsResponse, Product} from 'app/types/requests.js';
import fetch from 'node-fetch';

import {Game, ScoresMap} from '../types/entities.js';
import {currencyConverter} from './currency-converter.js';

async function asyncJsonParseIn5Sec(response: Response): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const timeOut = setTimeout(() => reject('Too long json parsing'), 5e3);

    try {
      const result = await response.json();
      clearTimeout(timeOut);
      resolve(result);
    } catch (error) {
      clearTimeout(timeOut);
      reject(error)
    }
  });
}

async function stubborn_fetch(url: string, attempt = 3): Promise<any | null> {
  try {
    const response = await fetch(url) as Response;
    const result = await asyncJsonParseIn5Sec(response);
    return result as Promise<any>;
  } catch (error) {
    console.error('Error at stubborn_fetch!');
    console.error('  url:', url);
    console.error('  error:', error);

    return attempt <= 0 ? null : stubborn_fetch(url, attempt - 1);
  }
}

class GamesCollector {
  market: string;
  gameIds: string[];
  games: Game[];
  gameScores: ScoresMap = {};

  constructor(gamesIds?: string[], games?: Game[], market = 'AR') {
    this.market = market;
    this.gameIds = gamesIds || [];
    this.games = games || [];
    this.gameScores = {};
  }

  async init(): Promise<void> {
    if ([this.gameIds.length, this.games.length].includes(0)) {
      await this.refreshOffers();
    }
  }

  async setGamesIds(gamesIds: string[]): Promise<void> {
    this.gameIds = gamesIds;
    this.games = await this.collectGamesByIds();
  }

  async refreshOffers(): Promise<void> {
    this.gameIds = await this.collectGameIds();
    this.games = await this.collectGamesByIds();
    console.debug('Offers refreshed');
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

    const totalItesmResponse = await stubborn_fetch(getUrl(0, 1)) as IdsResponse;
    const totalItems = totalItesmResponse.PagingInfo.TotalItems || 2000;

    const idsPerRequest = 200;
    const requestsCount = Math.ceil(totalItems / 200);
    const requests = [];

    this.gameScores = {};
    const mapIdsResponse = ({Items}: IdsResponse): string[] => Items.map(({Id, PredictedScore}) => {
      this.gameScores[Id] = PredictedScore;
      return Id;
    });

    for (let part = 0; part < requestsCount; part++) {
      const request: Promise<IdsResponse> = stubborn_fetch(getUrl(part * idsPerRequest, idsPerRequest));
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
      `${idsChunk.join(',')}&market=${this.market}&languages=ru-ru&MS-CV=DGU1mcuYo0WMMp F.1`);

    // Количество одновременных запросов, которые сервер XBOX способен обработать
    const chunkSize = 15;
    const chunksCount = Math.ceil(reqUrls.length / chunkSize);
    const games: Game[] = [];

    console.debug('Ferfreshing games for ', this.market);
    for (let chunkIndex = 0; chunkIndex < chunksCount; chunkIndex++) {
      const startIndex = chunkIndex * chunkSize;
      const endIndex = startIndex + chunkSize;
      const urlsChunk: string[] = reqUrls.slice(startIndex, endIndex);
      console.debug(`  chunk ${chunkIndex + 1} of ${chunksCount}:`);
      console.debug(`    started`);

      const reqs = urlsChunk.map((url): Promise<GamesResponse> => stubborn_fetch(url));
      const resps: Array<GamesResponse | null> = await Promise.all(reqs);
      resps.forEach((response: GamesResponse | null) => {
        if (response == null) {
          console.error('urlsChunk response failed');
          return;
        }

        response.Products.forEach(({
          ProductId: id,
          MarketProperties: marketProps,
          LocalizedProperties: lang,
          DisplaySkuAvailabilities: market
        }: Product) => {
          const title = lang[0]?.ProductTitle || '';
          const price = market[0]?.Availabilities[0]?.OrderManagementData?.Price?.ListPrice || 0;
          const currency = market[0]?.Availabilities[0]?.OrderManagementData?.Price?.CurrencyCode || 'ARS';
          const convertedPrice = currencyConverter.getConvertedPrice(price, currency);

          const packages = market[0].Sku.Properties.Packages;
          const hasDlcFamily = packages && packages[0] ? packages[0].MainPackageFamilyNameForDlc !== null : false;
          const hasAddOnParent = marketProps && marketProps[0] &&
            marketProps[0].RelatedProducts?.some(({RelationshipType}) => RelationshipType === 'addOnParent');

          const isDlc = hasDlcFamily || hasAddOnParent;

          if (title === '' || price === 0) {
            console.error('empty game with id', id);
            return;
          }

          games.push({
            id, title, isDlc, currency, price, convertedPrice, score: this.gameScores[id] || 0, market: this.market,
          });
        });
      });
      console.debug(`    finished`);
    }

    console.debug('  chunks finished');
    return games;
  }
}

export default GamesCollector;
