import fm from './file-manager.js';
import fetch from 'node-fetch';
import l from './logger.js';
// Requests examples on https://www.xbox.com/es-ar/games/all-games?cat=onsale

interface Game {
  id?: string;
  title: string;
  currency: string;
  price: number;
  score?: number;
  market?: string;
}

interface ScoresMap {
  [gameId: string]: number;
}

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
    l.error(`try${times - 1}Times catch:`, e);
    return times > 0 ?
      await tryNTimes(callback, times - 1) :
      false;
  }
}

class GamesCollector {
  market: string;
  gameIds: string[];
  games: Game[];
  gameScores: ScoresMap;

  constructor(market: string) {
    this.market = market || 'AR';
    this.gameIds = fm.readData(`gamesIds/${this.market}`) || [];
    this.games = fm.readData(`games/${this.market}`) || [];
    this.gameScores = {};
  }

  async init(): Promise<void> {
    if (this.gameIds.length === 0) {
      this.gameIds = await this._collectGameIds();
    }

    if (this.games.length === 0) {
      this.games = await this._collectGamesByIds(this.gameIds);
    }
  }

  async refreshPrices(): Promise<Game[]> {
    return this._collectGamesByIds(this.gameIds)
      .then(games => this.games = games);
  }

  async refreshOffers(): Promise<Game[]> {
    return this._collectGameIds()
      .then(gameIds => this.gameIds = gameIds)
      .then(() => this.refreshPrices());
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

  async _collectGameIds(category = 'Deal'): Promise<string[]> {
    console.debug('_collectGameIds called', this.market);
    const getUrl = (skip = 0, count = 200) => `https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/${category}?Market=${this.market}&ItemTypes=Game&deviceFamily=Windows.Xbox&count=${count}&skipitems=${skip}`;
    const mapBody = ({Items}: any) => Items.map(({Id, PredictedScore}: any) => {
      this.gameScores[Id] = PredictedScore;
      return Id;
    });
    const totalItems = await fetch(getUrl(0, 1)).then(resp => resp.json())
      .then(({PagingInfo}: any) => PagingInfo?.TotalItems || 2000);

    const idsPerRequest = 200;
    const requestsCount = Math.ceil(totalItems / 200);
    const requests = [];

    for (let part = 0; part < requestsCount; part++) {
      requests.push(
        fetch(getUrl(part * idsPerRequest, idsPerRequest))
          .then(resp => resp.json()).then(mapBody)
      );
    }

    return Promise.all(requests)
      .then(bodies => bodies.reduce((acc, cur) => {
        cur.forEach((id: string) => acc.push(id));
        return acc;
      }, []))
      .then(gameIds => {
        fm.writeData(`gamesIds/${this.market}`, gameIds);
        return gameIds;
      });
  }

  _splitByParts(fullArray: any[], partSize = 20) {
    const parts = Math.ceil(fullArray.length / partSize);
    const subArrays = [];

    for (let quadIndex = 0; quadIndex < parts; quadIndex++) {
      const startIndex = quadIndex * partSize;
      const endIndex = startIndex + partSize;
      subArrays.push(fullArray.slice(startIndex, endIndex));
    }

    return subArrays;
  }

  async _collectGamesByIds(gameIds: string[]): Promise<Game[]> {
    const reqUrls = this._splitByParts(gameIds)
      .map(idsPart => `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${idsPart.join(',')}` +
        `&market=${this.market}&languages=ru-ru`);

    // Количество одновременных запросов, которые сервер XBOX способен обработать
    const partSize = 15;
    const gamesChunks: any[] = [];
    l.debug('_collectGamesByIds called', this.market);
    for (let part = 0; part * partSize < reqUrls.length; part++) {
      l.debug(`part ${part} of ${Math.ceil(reqUrls.length / partSize)}`);
      const subUrls = reqUrls.slice(part * partSize, part * partSize + partSize);
      const reqs = subUrls.map(url => tryNTimes(async () => {
        return fetch(url).then(res => res.json()).then(({Products}: any) => gamesChunks.push(Products));
      }));
      await Promise.all(reqs);
    }

    l.debug(`Before chunk reduce`);
    const games = gamesChunks.reduce((acc, products) => {
      if (products == null) {
        return acc;
      }

      products.map(({ProductId: id, LocalizedProperties: lang, DisplaySkuAvailabilities: market}: any) => ({
        id,
        title: lang[0]?.ProductTitle || '',
        currency: market[0]?.Availabilities[0]?.OrderManagementData?.Price?.CurrencyCode || 'ARS',
        price: market[0]?.Availabilities[0]?.OrderManagementData?.Price?.ListPrice || 0,
      }))
        .filter(({title, price}: any) => title !== '' && price !== 0)
        .forEach((prod: any) => acc.push(prod));

      return acc;
    }, []);

    l.debug(`After chunk reduce`);
    fm.writeData(`games/${this.market}`, games);
    l.debug(`After writing games`);
    return games;
  }
}

export default GamesCollector;
