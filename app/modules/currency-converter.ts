// @ts-ignore
import CC from 'currency-converter-lt';

import {CurrencyMap} from 'app/types/entities.js';
import fm from './file-manager.js';
import regions from './regions.js';

const currencies: string[] = regions.map(({currency}) => currency);
const backupCurrencies: CurrencyMap = {
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

class CurrencyConverter {
  currencyValues: CurrencyMap = {};

  async init(): Promise<void> {
    this.currencyValues = fm.readData('currency-values') as CurrencyMap || {};
    if (Object.values(this.currencyValues).length === 0) {
      this.refreshCurrencies().catch(error => {
        console.error(`refreshCurrencies:`, error);
        currencies.forEach(currency =>
          this.currencyValues[currency] = backupCurrencies[currency] || 0
        );
      });
    }
  }

  getConvertedPrice(price: number, currency = 'ARS'): number {
    return Math.floor(price * this.currencyValues[currency]);
  }

  async refreshCurrencies(): Promise<void> {
    for (let currency of currencies) {
      await new CC({from: currency, to: 'RUB', amount: 1}).convert()
        .then((currencyValue: number) => this.currencyValues[currency] = currencyValue);
    }

    fm.writeData('currency-values', this.currencyValues);
  }
}

export default new CurrencyConverter();
