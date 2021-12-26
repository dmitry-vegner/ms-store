import fetch from 'node-fetch';

import {Game, GamesMap, MarketsMap} from 'app/types/entities.js';
import GamesCollector from './games-collector.js';
import regions from './regions.js';

interface SuggestionsResponse {
  ResultSets: {
    Suggests: Suggestion[];
  }[];
  [excessKey: string]: any;
}

interface Suggestion {
  Source: string;
  Title: string;
  Description: string | null;
  Url: string;
  Metas: Meta[];
  [excessKey: string]: any;
}

interface Meta {
  Key: 'BigCatalogId' | 'ProductType' | string;
  Value: string;
}

export class GlobalFinder {
  private markets: string[] = [];
  private gamesByMarkets: MarketsMap = {};
  private collectors: GamesCollector[] = [];

  constructor() {
    this.markets = regions.map(({key}) => key);
    this.collectors = this.markets.map(market => new GamesCollector([], [], market));
  }

  async getCheapestGamesByQuery(query: string): Promise<Game[]> {
    const suggestions = await this.getSuggestions(query);
    const gamesIds = await this.getGamesIdsFromSuggestion(suggestions);
    await this.collectGamesByMarkets(gamesIds);
    return this.getCheapestGames(gamesIds);
  }

  private async getSuggestions(query: string): Promise<Suggestion[]> {
    const modifiedQuery = query.toLowerCase().replace(' ', '%20');
    const response = await fetch(
      `https://www.microsoft.com/services/api/v3/suggest?market=ru-ru&clientId=7F27B536-CF6B-4C65-8638-A0F8CBDFCA65&sources=Microsoft-Terms%2CIris-Products%2CDCatAll-Products&filter=%2BClientType%3AStoreWeb&counts=15%2C1%2C5&query=${modifiedQuery}`,
      {headers: {Accept: 'application/json'}}
    );
    const result = await response.json() as SuggestionsResponse;

    return result?.ResultSets[0]?.Suggests;
  }

  private async getGamesIdsFromSuggestion(suggestions: Suggestion[]): Promise<string[]> {
    return suggestions
      .filter(({Source}) => Source === 'Games')
      .map(({Metas}) => Metas.find(({Key}) => Key === 'BigCatalogId')?.Value || '');
  }

  private async collectGamesByMarkets(gamesIds: string[]): Promise<void> {
    this.gamesByMarkets = {};
    for (let collector of this.collectors) {
      await collector.setGamesIds(gamesIds);
      this.gamesByMarkets[collector.market] = this.getGamesMapByGamesArray(collector.getOffers());
    }
  }

  private getCheapestGames(gamesIds: string[]): Game[] {
    const cheapestGames: GamesMap = {};

    gamesIds.forEach(id => {
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

      cheapestGames[id] = this.gamesByMarkets[cheapestMarket][id];
    });

    return Object.values(cheapestGames);
  }

  private getGamesMapByGamesArray(games: Game[]): GamesMap {
    const gamesMap: GamesMap = {};
    games.forEach(game => gamesMap[game.id] = game);
    return gamesMap;
  }
}

export const globalFinder = new GlobalFinder();
