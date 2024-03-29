import {Game} from '../types/entities.js';
import {currencyConverter} from './currency-converter.js';
import feeCalculator from './fee-calculator.js';
import regions from './regions.js';

class GamesModificator {
  private games: Game[];
  offers = [];

  constructor(games: Game[] = []) {
    this.games = games;
  }

  async init(): Promise<void> {
    await currencyConverter.init();
  }

  findGames(query: string): string {
    if (typeof query !== 'string') {
      return 'Параметром поиска игры должна быть строка';
    }

    if (query.length < 3) {
      return 'Строка для поиска игры должна содержать не менее трёх символов';
    }

    query = query.toLowerCase();
    const foundGames: Game[] = this.games
      .filter(({title}) => title.toLowerCase().includes(query))

    return foundGames.length ?
      foundGames.map(game => this.getGameRecord(game)).join('\n') :
      'Игр по вашему запросу не найдено. Можете попробовать глобальный поиск вне распродаж: /findglobal.';
  }

  getReadableList(limit = 200, isComplex = false): string {
    limit = limit || this.games.length + 1;

    const sortedGames: string[] = this.games
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map(game => this.getGameRecord(game, isComplex))
      .sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);

    const letters = sortedGames.map(offerName => offerName.toUpperCase().slice(0, 1));
    const uniqueLetters: string[] = letters.reduce((uniqueLetters: string[], letter) => uniqueLetters.includes(letter) ? uniqueLetters : [...uniqueLetters, letter], []);

    const gamesByGroups = uniqueLetters.reduce((allGames: any, letter) => {
      allGames[letter] = sortedGames.filter(name => name.toUpperCase().slice(0, 1) === letter);
      return allGames;
    }, {});

    return Object.keys(gamesByGroups)
      .map(letter => letter + '\n\n' + gamesByGroups[letter].join('\n') + '\n')
      .join('\n');
  }

  private getGameRecord({id, title, isDlc, currency, price, market}: Game, isComplex = true): string {
    const convertedPrice = currencyConverter.getConvertedPrice(price, currency);
    const endPrice = feeCalculator.getTaxedPrice(convertedPrice);
    const fee = endPrice - convertedPrice;

    const marketSuffix = market === 'AR' ? '' : ' ' + regions.find(({key}) => key === market)?.title;
    const dlcSuffix = isDlc ? ' DLC' : '';
    return isComplex ?
      `[${id}${marketSuffix}] ${title}${dlcSuffix} — ${convertedPrice} + ${fee} = ${endPrice}₽` :
      `${title}${dlcSuffix} — ${endPrice}${marketSuffix}`;
  }
}

export default GamesModificator;
