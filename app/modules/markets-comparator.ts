import {Game, GamesMap, MarketsMap} from '../types/entities.js';
import CurrencyConverter from './currency-converter.js';
import GamesCollector from './games-collector.js';
import fileManager from './file-manager.js';
import regions from './regions.js';

class MarketsComparator {
  markets: string[];
  collectors: GamesCollector[];
  gamesByMarkets: MarketsMap = {};
  cheapestGames: GamesMap;
  allGamesIds: string[] = [];

  constructor() {
    this.markets = regions.map(({key}) => key);
    this.collectors = this.markets.map(market => new GamesCollector(market));
    this.cheapestGames = fileManager.readData('games/cheapest') || {};
  }

  async init(): Promise<void> {
    try {
      await CurrencyConverter.init();
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

  private collectGamesByMarkets() {
    this.collectors.forEach(collector => this.gamesByMarkets[collector.market] =
      this.getGamesMapByGamesArray(collector.getOffers())
    );
  }

  findCheapestGames(): void {
    this.cheapestGames = {};

    this.allGamesIds.forEach(id => {
      const availableMarkets = this.markets.filter(market => this.gamesByMarkets[market][id] != null);
      let cheapestMarket = availableMarkets[0];

      availableMarkets.forEach(marketKey => {
        const price = this.gamesByMarkets[marketKey][id].convertedPrice;
        if (price < this.gamesByMarkets[cheapestMarket][id].convertedPrice) {
          cheapestMarket = marketKey;
        }
      });

      this.cheapestGames[id] = this.gamesByMarkets[cheapestMarket][id];
    });

    fileManager.writeData('games/cheapest', this.cheapestGames);
  }

  getCheapestGames(): Game[] {
    return Object.values(this.cheapestGames);
  }
}

export default new MarketsComparator();
