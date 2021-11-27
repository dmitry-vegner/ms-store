import CC from 'currency-converter-lt';
import fm from './file-manager.js';
import regions from './regions.js';
import l from './logger.js';

const currencies = regions.map(({currency}) => currency);
const backupCurrencies = {
  ARS: 0.73,
  AUD: 52.73,
  BRL: 13.09,
  CAD: 57.71,
  CHF: 78.45,
  CLP: 0.087,
  CNY: 11.4,
  COP: 0.019,
  CZK: 3.26,
  EUR: 82.58,
  EGP: 4.62,
  HKD: 9.4,
  HUF: 0.227,
  INR: 0.98,
  ISK: 0.554,
  JPY: 0.64,
  KRW: 0.062,
  MXN: 3.52,
  NOK: 8.25,
  NZD: 51.3,
  PLN: 17.67,
  RUB: 1,
  SEK: 8.18,
  SGD: 53.53,
  TRY: 6.66,
  TWD: 2.61,
  GBP: 98.14,
  USD: 72.76,
  ZAR: 4.66,
};

class PriceConverter {
  currencyValues = {};

  ruleTypes = ['ranges'];
  ruleType = this.ruleTypes[0];
  rules = {
    ranges: {
      '0-500': 85,
      '500-700': 135,
      '700-1400': 140,
      '1500-2000': 150,
    }
  };
  rule = this.rules[this.ruleType];
  
  constructor() {
    console.debug('price constructor called')
  }

  async init() {
    this.currencyValues = fm.readData('currency-values') || {};
    if (Object.values(this.currencyValues).length === 0) {
      this.refreshCurrencies().catch(error => {
        l.error(`refreshCurrencies:`, error);
        currencies.forEach(currency =>
          this.currencyValues[currency] = backupCurrencies[currency] || 0
        );
      });
    }
  }

  getTaxedPrice(basePrice) {
    let tax = 0;

    if (this.ruleType === 'ranges') {
      const targetRange = Object.keys(this.rule).find(range => {
        const [from, to] = range.split('-');
        return basePrice >= from && basePrice <= to;
      }) || Object.keys(this.rule).pop();
      tax = this.rule[targetRange];
    }

    return Math.floor(basePrice + tax);
  }

  getConvertedPrice(price, currency = 'ARS') {
    return Math.floor(price * this.currencyValues[currency]);
  }

  async refreshCurrencies() {
    for (let currency of currencies) {
      await new CC({from: currency, to: 'RUB', amount: 1}).convert()
        .then(currencyValue => this.currencyValues[currency] = currencyValue);
    }

    fm.writeData('currency-values', this.currencyValues);
  }
}

export default new PriceConverter();
