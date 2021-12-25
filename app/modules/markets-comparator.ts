import {Game, GamesMap, IdsByMarketsMap, MarketsMap} from '../types/entities.js';
import {currencyConverter} from './currency-converter.js';
import GamesCollector from './games-collector.js';
import fileManager from './file-manager.js';
import regions from './regions.js';

export class MarketsComparator {
  markets: string[];
  collectors: GamesCollector[];
  gamesByMarkets: MarketsMap = {};
  idsByMarkets: IdsByMarketsMap = {};
  cheapestGames: GamesMap;
  allGamesIds: string[] = [];

  constructor() {
    this.markets = regions.map(({key}) => key);
    this.idsByMarkets = fileManager.readData('games/ids') || {};
    this.gamesByMarkets = fileManager.readData('games/all') || {};
    this.cheapestGames = fileManager.readData('games/cheapest') || {};

    this.collectors = this.markets.map(market => new GamesCollector(
      this.idsByMarkets[market],
      this.gamesByMarkets[market] ? this.getGamesArrayByGamesMap(this.gamesByMarkets[market]) : undefined,
      market
    ));
  }

  async init(): Promise<void> {
    try {
      await currencyConverter.init();
    } catch (e) {
      console.error('Цены ебаные', e);
    }

    try {
      for (let collector of this.collectors) {
        await collector.init();
      }
    } catch (e) {
      console.error('Фетчеры ебаные', e);
    }

    try {
      this.collectGamesByMarkets();
    } catch (e) {
      console.error('Сбор игр по маркетам нахуй', e);
    }

    try {
      this.findCheapestGames();
    } catch (e) {
      console.error('Поиск дешёвок ебаных', e);
    }
  }

  async refreshMarkets(): Promise<void> {
    try {
      for (let collector of this.collectors) {
        await collector.refreshOffers();
        console.debug('Collecter refreshed its offers');
      }
      console.debug('success await collector.refreshOffers()');
    } catch (e) {
      console.debug('fail await collector.refreshOffers()', e);
    }

    try {
      this.collectGamesByMarkets();
      console.debug('success this.collectGamesByMarkets()');
    } catch (e) {
      console.debug('fail this.collectGamesByMarkets()', e);
    }

    try {
      this.findCheapestGames();
      console.debug('success this.findCheapestGames()');
    } catch (e) {
      console.debug('fail this.findCheapestGames()', e);
    }
  }

  private getGamesMapByGamesArray(games: Game[]): GamesMap {
    const gamesMap: GamesMap = {};

    games.forEach(game => {
      if (!this.allGamesIds.includes(game.id)) {
        this.allGamesIds.push(game.id);
      }

      gamesMap[game.id] = game;
    });

    return gamesMap;
  }

  private getGamesArrayByGamesMap(gamesMap: GamesMap): Game[] {
    return Object.values(gamesMap);
  }

  private collectGamesByMarkets() {
    this.allGamesIds = [];
    this.cheapestGames = {};

    this.collectors.forEach(collector => {
      this.gamesByMarkets[collector.market] = this.getGamesMapByGamesArray(collector.getOffers());
      this.idsByMarkets[collector.market] = collector.getGameIds();
    });

    fileManager.writeData('games/ids', this.idsByMarkets);
    fileManager.writeData('games/all', this.gamesByMarkets);
  }

  findCheapestGames(): void {
    this.allGamesIds.forEach(id => {
      const availableMarkets = this.markets.filter(market => this.gamesByMarkets[market][id] != null);
      if (availableMarkets.length === 0) {
        console.warn('There is excess games IDS, which are already not exist!', id);
        return;
      }

      let cheapestMarket = availableMarkets[0];
      availableMarkets.forEach(marketKey => {
        const price = this.gamesByMarkets[marketKey][id].convertedPrice;
        if (price < this.gamesByMarkets[cheapestMarket][id].convertedPrice) {
          cheapestMarket = marketKey;
        }
      });

      this.cheapestGames[id] = this.gamesByMarkets[cheapestMarket][id];
    });

    try {
      fileManager.writeData('games/cheapest', this.cheapestGames);
    } catch (e) {
      console.error('Error when writing games/cheapest file');
      console.error(e);
    }
  }

  getCheapestGames(): Game[] {
    return Object.values(this.cheapestGames);
  }
}

export const marketsComparator = new MarketsComparator();
