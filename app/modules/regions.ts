export interface Region {
  key: string;
  title: string;
  currency: string;
}

const regions: Region[] = [
  {key: 'AR', title: 'Аргентина', currency: 'ARS'},
  {key: 'AU', title: 'Австралия', currency: 'AUD'},
  {key: 'BR', title: 'Бразилия', currency: 'BRL'},
  {key: 'CA', title: 'Канада', currency: 'CAD'},
  {key: 'CH', title: 'Швейцария', currency: 'CHF'},
  {key: 'CL', title: 'Чили', currency: 'CLP'},
  {key: 'CN', title: 'Китай', currency: 'CNY'},
  {key: 'CO', title: 'Колумбия', currency: 'COP'},
  {key: 'CZ', title: 'Чехия', currency: 'CZK'},
  {key: 'DE', title: 'Германия', currency: 'EUR'},
  {key: 'EG', title: 'Египет', currency: 'EGP'},
  {key: 'HK', title: 'Гонконг', currency: 'HKD'},
  {key: 'HU', title: 'Венгрия', currency: 'HUF'},
  {key: 'IN', title: 'Индия', currency: 'INR'},
  {key: 'IS', title: 'Исландия', currency: 'ISK'},
  {key: 'JP', title: 'Япония', currency: 'JPY'},
  {key: 'KR', title: 'Южная Корея', currency: 'KRW'},
  {key: 'MX', title: 'Мексика', currency: 'MXN'},
  {key: 'NO', title: 'Норвегия', currency: 'NOK'},
  {key: 'NZ', title: 'Новая Зеландия', currency: 'NZD'},
  {key: 'PL', title: 'Польша', currency: 'PLN'},
  {key: 'RU', title: 'Россия', currency: 'RUB'},
  {key: 'SE', title: 'Швеция', currency: 'SEK'},
  {key: 'SG', title: 'Сингапур', currency: 'SGD'},
  {key: 'TR', title: 'Турция', currency: 'TRY'},
  {key: 'TW', title: 'Таивань', currency: 'TWD'},
  {key: 'GB', title: 'Великобритания', currency: 'GBP'},
  {key: 'US', title: 'США', currency: 'USD'},
  {key: 'ZA', title: 'ЮАР', currency: 'ZAR'},
];

export default regions;
