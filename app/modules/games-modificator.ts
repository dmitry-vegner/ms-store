import prices from './price-converter.js';

interface RawGame {
  title: string;
  currency: string;
  price: number;
}

const templateGames: RawGame[] = [
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

class GamesModificator {
  rawGames: RawGame[] = [];
  offers = [];

  constructor(rawGames: RawGame[] = []) {
    this.rawGames = rawGames;
  }

  async init(): Promise<void> {
    return prices.init();
  }

  setGames(rawGames: RawGame[]): void {
    this.rawGames = rawGames;
  }

  getGames(): RawGame[] {
    return this.rawGames;
  }

  findGames(substring: string): string {
    if (typeof substring !== 'string') {
      return 'Параметром поиска игры должна быть строка';
    }

    if (substring.length < 3) {
      return 'Строка для поиска игры должна содержать не менее трёх символов';
    }

    substring = substring.toLowerCase();
    return this.rawGames
      .filter(({title}: {title: string}) => title.toLowerCase().includes(substring))
      .map(({title, currency, price}) => {
        const endPrice = prices.getTaxedPrice(prices.getConvertedPrice(price, currency));
        return `${title} — ${endPrice}`;
      })
      .join('\n');
  }

  _prepareOffersFromRawGames() {
    return this.rawGames.map(({title, currency, price}) => {
      const endPrice = prices.getTaxedPrice(prices.getConvertedPrice(price, currency));
      return `${title} — ${endPrice}`;
    });
  }

  getReadableList(limit = 200) {
    const offers: string[] = this._prepareOffersFromRawGames();

    // TODO: let offersByScore = offers.sort((a, b) => a.score < b.score ? -1 : 1);
    let offersByScore = offers.sort((a, b) => a < b ? -1 : 1);
    if (limit !== 0) {
      offersByScore = offersByScore.slice(0, limit);
    }
    const offersByAlphabet = offersByScore.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);

    const letters = offersByAlphabet.map(offerName => offerName.toUpperCase().slice(0, 1));
    const uniqueLetters: string[] = letters.reduce((uniqueLetters: string[], letter) => uniqueLetters.includes(letter) ? uniqueLetters : [...uniqueLetters, letter], []);

    const gamesByGroups = uniqueLetters.reduce((allGames: any, letter) => {
      allGames[letter] = offersByAlphabet.filter(name => name.toUpperCase().slice(0, 1) === letter);
      return allGames;
    }, {});

    return Object.keys(gamesByGroups)
      .map(letter => letter + '\n\n' + gamesByGroups[letter].join('\n') + '\n')
      .join('\n');
  }
}

export default new GamesModificator(templateGames);
