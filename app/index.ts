import PriceConverter from './modules/price-converter.js';
import MarketsComparator from './modules/markets-comparator.js';
import GamesModificator from './modules/games-modificator.js';
import fm from './modules/file-manager.js';
import l from './modules/logger.js';
// @ts-ignore
import Tgfancy from 'tgfancy';

const helpText = 
`/list - Сформировать список из N (по умолчанию 200) наиболее популярных игр
Пример: /list 100

/refresh_currencies - Обновить курсы валют
Для применения новых валют потребуется обновить список игр
Крайне не рекомендуется злоупотреблять: сервер с валютами агрессивно реагирует на частые запросы

/refresh_games - Обновить список игр
Получение списка игр со всех рынков и составление списка самых дешёвых игр
Может потребоваться продолжительное время, поэтому рекомендуется не злоупотреблять

/find - Найти игру по части названия
Вернёт список игр, содержащих искомую подстроку
Пример: find halo

/ping - Проверить активность бота
Вернёт pong, если бот работает, иначе - обращайтесь к автору бота

/help - Получить данное сообщение`;

const token = '2106918560:AAHcDnYBpR5qQrCYJLp_mmfXAJPSjYkSlac';
const fancyBot = new Tgfancy(token, {
  polling: true,
  tgfancy: {textPaging: true}
});

async function tryNTimes(callback: any, times = 5): Promise<boolean> {
  try {
    await callback();
    return true;
  } catch (e) {
    l.error(`try  ${callback} ${times - 1}Times catch:`, e);
    return times > 0 ?
      await tryNTimes(callback, times - 1) :
      false;
  }
}

async function initData() {
  try {
    let e = true;
    l.clearLogs();
    e = await tryNTimes(async () => await PriceConverter.init());
    if (!e) throw 'Жопа в ценниках';
    l.log('PriceConverter init');
    e = await tryNTimes(async () => await MarketsComparator.init());
    if (!e) throw 'Жопа в сравнилке';
    l.log('MarketsComparator init');
    e = await tryNTimes(async () => await GamesModificator.init());
    if (!e) throw 'Жопа в хранилище!';
    l.log('GamesModificator init');

    MarketsComparator.findCheapestGames();
    const cheapestGames = MarketsComparator.getCheapestGames();
    const isCheapestGamesLoaded = Object.values(cheapestGames).length !== 0;
    l.log('isCheapestGamesLoaded', isCheapestGamesLoaded);
    GamesModificator.setGames(Object.values(cheapestGames));
  } catch (e) {
    l.error('Error at init:', e);
  }
}

let passwords = fm.readData('auth/passwords');
const approvedUsers = fm.readData('auth/users');
const checkUser = (chatId: string) => {
  if (approvedUsers.find(({chatId: approvedChatId}: {chatId: string}) => approvedChatId === chatId)) {
    return true;
  }

  fancyBot.sendMessage(chatId, 'Чтобы получить доступ к функциям бота введите ключ в формате команды:\n/password key');
  return false;
}

initData().then(() => {
  l.log('bot init');
  fancyBot.onText(/^\/password ?(.*)$/, async ({chat}: {chat: any}, [_, password]: [_: any, password: string]) => {
    if (passwords.includes(password)) {
      l.log('/password', password, chat.id);
      passwords = passwords.filter((pass: string) => pass !== password);
      fm.writeData('auth/passwords', passwords);
      approvedUsers.push({chatId: chat.id, password});
      fm.writeData('auth/users', approvedUsers);
      fancyBot.sendMessage(chat.id, 'Авторизация успешна!');
      return;
    }

    fancyBot.sendMessage(chat.id, 'Ключ не подходит!');
  });

  fancyBot.onText(/^\/list ?(\d*)/, async ({chat}: {chat: any}, [_, limit]: [_: any, limit: string]) => {
    l.log('/list', limit, chat.id);
    if (!checkUser(chat.id)) return;
    const list = GamesModificator.getReadableList(+limit || undefined);
    fancyBot.sendMessage(chat.id, list);
  });

  fancyBot.onText(/^\/refresh_currencies$/, async ({chat}: {chat: any}) => {
    l.log('/refresh_currencies', chat.id);
    if (!checkUser(chat.id)) return;
    fancyBot.sendMessage(chat.id, 'Пожалуйста, подождите. Это может занять время...');
    PriceConverter.refreshCurrencies()
      .then(() => fancyBot.sendMessage(chat.id, 'Курсы валют успешно обновлены'))
      .catch(error => {
        l.error('/refresh_currencies', error);
        fancyBot.sendMessage(chat.id, 'При обновлении курсов валют произошла ошибка');
      });
  });

  fancyBot.onText(/^\/refresh_games$/, async ({chat}: {chat: any}) => {
    l.log('/refresh_games', chat.id);
    if (!checkUser(chat.id)) return;
    fancyBot.sendMessage(chat.id, 'Пожалуйста, подождите. Процесс займёт несколько минут!');
    try {
      await MarketsComparator.refreshMarkets();
      l.debug('/refresh_games after await MarketsComparator.refreshMarkets()');
      const cheapestGames = MarketsComparator.getCheapestGames();
      l.debug('/refresh_games after MarketsComparator.getCheapestGames');
      GamesModificator.setGames(Object.values(cheapestGames));
      l.debug('/refresh_games after GamesModificator.setGames(Object.values(cheapestGames))');
      fancyBot.sendMessage(chat.id, 'Обновление завершено!');
    } catch (error) {
      l.error(`/refresh_games`, error);
      fancyBot.sendMessage(chat.id, 'Обновление не удалось, попробуйте ещё раз :(');
    }
  });

  fancyBot.onText(/^\/find ?(.*)$/, async ({chat}: {chat: any}, [_, query]: [_: any, query: string]) => {
    l.log(`/find ${query}`, chat.id);
    if (!checkUser(chat.id)) return;
    const foundGames = GamesModificator.findGames(query);
    fancyBot.sendMessage(chat.id, foundGames);
  });

  fancyBot.onText(/^\/ping$/, async ({chat}: {chat: any}) => {
    l.log(`/ping`, chat.id);
    fancyBot.sendMessage(chat.id, 'pong');
  });

  fancyBot.onText(/^\/help$/, async ({chat}: {chat: any}) => {
    l.log(`/help`, chat.id);
    if (!checkUser(chat.id)) return;
    fancyBot.sendMessage(chat.id, helpText);
  });
});
