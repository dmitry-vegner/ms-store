import fm from './file-manager.js';
import fetch from 'node-fetch';
import l from './logger.js';
// Requests examples on https://www.xbox.com/es-ar/games/all-games?cat=onsale

const templateIds = [
  '9NBLGGH537BL', 'BQ2NNLQPS8RS', 'BSLX1RNXR6H7', 'BW85KQB8Q31M',
  '9N6Z8DQXSQWH', '9PGPQK0XTHRZ', '9NJRX71M5X9P', 'C1KX6KNB7XMM',
  'BWMH951M3G3P', 'C01Z9J8S9BJP', '9P3PL76N0KWZ', 'BNRH7BRC1D02'
];

const templateGames = [
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

async function tryNTimes(callback, times = 5) {
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
  constructor(market) {
    this.market = market || 'AR';
    this.gameIds = fm.readData(`gamesIds/${this.market}`) || [];
    this.games = fm.readData(`games/${this.market}`) || [];
    this.gameScores = {};
  }

  async init() {
    if (this.gameIds.length === 0) {
      this.gameIds = await this._collectGameIds();
    }

    if (this.games.length === 0) {
      this.games = await this._collectGamesByIds(this.gameIds);
    }
  }

  async refreshPrices() {
    return this._collectGamesByIds(this.gameIds)
      .then(games => this.games = games);
  }

  async refreshOffers() {
    return this._collectGameIds()
      .then(gameIds => this.gameIds = gameIds)
      .then(() => this.refreshPrices());
  }

  getOffers() {
    return this.games;
  }

  getGameIds() {
    return this.gameIds;
  }

  getGameScores() {
    return this.gameScores;
  }

  async _collectGameIds(category = 'Deal') {
    console.debug('_collectGameIds called', this.market);
    const getUrl = (skip = 0, count = 200) => `https://reco-public.rec.mp.microsoft.com/channels/Reco/V8.0/Lists/Computed/${category}?Market=${this.market}&ItemTypes=Game&deviceFamily=Windows.Xbox&count=${count}&skipitems=${skip}`;
    const mapBody = ({Items}) => Items.map(({Id, PredictedScore}) => {
      this.gameScores[Id] = PredictedScore;
      return Id;
    });
    const totalItems = await fetch(getUrl(0, 1)).then(resp => resp.json())
      .then(({PagingInfo}) => PagingInfo?.TotalItems || 2000);

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
        cur.forEach(id => acc.push(id));
        return acc;
      }, []))
      .then(gameIds => {
        fm.writeData(`gamesIds/${this.market}`, gameIds);
        return gameIds;
      });
  }

  _splitByParts(fullArray, partSize = 20) {
    const parts = Math.ceil(fullArray.length / partSize);
    const subArrays = [];

    for (let quadIndex = 0; quadIndex < parts; quadIndex++) {
      const startIndex = quadIndex * partSize;
      const endIndex = startIndex + partSize;
      subArrays.push(fullArray.slice(startIndex, endIndex));
    }

    return subArrays;
  }

  async _collectGamesByIds(gameIds) {
    const reqUrls = this._splitByParts(gameIds)
      .map(idsPart => `https://displaycatalog.mp.microsoft.com/v7.0/products?bigIds=${idsPart.join(',')}` +
        `&market=${this.market}&languages=ru-ru`);

    // Количество одновременных запросов, которые сервер XBOX способен обработать
    const partSize = 15;
    const gamesChunks = [];
    l.debug('_collectGamesByIds called', this.market);
    for (let part = 0; part * partSize < reqUrls.length; part++) {
      l.debug(`part ${part} of ${Math.ceil(reqUrls.length / partSize)}`);
      const subUrls = reqUrls.slice(part * partSize, part * partSize + partSize);
      const reqs = subUrls.map(url => tryNTimes(async () => {
        return fetch(url).then(res => res.json()).then(({Products}) => gamesChunks.push(Products));
      }));
      await Promise.all(reqs);
    }

    l.debug(`Before chunk reduce`);
    const games = gamesChunks.reduce((acc, products) => {
      if (products == null) {
        return acc;
      }

      products.map(({ProductId: id, LocalizedProperties: lang, DisplaySkuAvailabilities: market}) => ({
        id,
        title: lang[0]?.ProductTitle || '',
        currency: market[0]?.Availabilities[0]?.OrderManagementData?.Price?.CurrencyCode || 'ARS',
        price: market[0]?.Availabilities[0]?.OrderManagementData?.Price?.ListPrice || 0,
      }))
        .filter(({title, price}) => title !== '' && price !== 0)
        .forEach(prod => acc.push(prod));

      return acc;
    }, []);

    l.debug(`After chunk reduce`);
    fm.writeData(`games/${this.market}`, games);
    l.debug(`After writing games`);
    return games;
  }
}

export default GamesCollector;
