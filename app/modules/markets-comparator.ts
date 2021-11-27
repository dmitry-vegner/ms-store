import Collector from './games-collector.js';
import PriceConverter from './price-converter.js';
import fm from './file-manager.js';
import regions from './regions.js';
import l from './logger.js';

interface GamesMap {
  [gameId: string]: {
    title: string;
    price: number;
    currency: string;
    market: string;
  }
}

interface MarketsMap {
  [marketId: string]: GamesMap;
}

class MarketsComparator {
  markets: string[];
  collectors: Collector[];
  gamesByMarkets: MarketsMap;
  cheapestGames: GamesMap;
  allGamesIds: string[];

  constructor() {
    this.markets = regions.map(({key}) => key);
    this.collectors = this.markets.map(market => new Collector(market));
    this.gamesByMarkets = {};
    this.cheapestGames = fm.readData('games/cheapest') || {};
    this.allGamesIds = [];
  }

  async init() {
    try {
      await PriceConverter.init();
    } catch (e) {
      l.error('Цены ебаные', e);
    }

    try {
      for (let collector of this.collectors) {
        await collector.init();
      }
    } catch (e) {
      l.error('Фетчеры ебаные', e);
    }

    try {
      this._collectGamesByMarkets();
    } catch (e) {
      l.error('Сбор игр по маркетам нахуй', e);
    }

    try {
      this.findCheapestGames();
    } catch (e) {
      l.error('Поиск дешёвок ебаных', e);
    }
  }

  async refreshMarkets() {
    try {
      for (let collector of this.collectors) {
        await collector.refreshOffers();
      }
      l.debug('success await collector.refreshOffers()');
    } catch (e) {
      l.debug('fail await collector.refreshOffers()', e);
    }

    try {
      this._collectGamesByMarkets();
      l.debug('success this._collectGamesByMarkets()');
    } catch (e) {
      l.debug('fail this._collectGamesByMarkets()', e);
    }

    try {
      this.findCheapestGames();
      l.debug('success this.findCheapestGames()');
    } catch (e) {
      l.debug('fail this.findCheapestGames()', e);
    }
  }

  _collectGamesByMarkets() {
    this.collectors.forEach(collector => {
      const market = collector.market;
      const scores = collector.getGameScores();

      this.gamesByMarkets[market] = collector.getOffers().reduce((gamesByIds: GamesMap, game) => {
        const updatedGame = {
          id: game.id,
          title: game.title,
          currency: 'RUB',
          price: PriceConverter.getConvertedPrice(game.price, game.currency),
          score: scores[game.id || ''],
          market,
        };

        if (!this.allGamesIds.includes(updatedGame.id!)) {
          this.allGamesIds.push(updatedGame.id!);
        }

        gamesByIds[updatedGame.id!] = updatedGame;
        return gamesByIds;
      }, {});
    });
  }

  findCheapestGames() {
    console.debug('total games: ', this.allGamesIds.length);
    this.allGamesIds.forEach(id => {
      const availableMarkets = this.markets.filter(market => this.gamesByMarkets[market][id] != null);
      let cheapestMarket = availableMarkets[0];

      availableMarkets.forEach(marketKey => {
        const price = this.gamesByMarkets[marketKey][id]?.price;
        if (price < this.gamesByMarkets[cheapestMarket][id].price) {
          cheapestMarket = marketKey;
        }
      });

      const {title, price, currency} = this.gamesByMarkets[cheapestMarket][id];
      this.cheapestGames[id] = {title, price, currency, market: cheapestMarket};
    });

    fm.writeData('games/cheapest', this.cheapestGames);
  }

  getCheapestGames() {
    if (Object.values(this.cheapestGames).length === 0) {
      this._collectGamesByMarkets();
      this.findCheapestGames();
    }

    return this.cheapestGames;
  }
}

export default new MarketsComparator();
