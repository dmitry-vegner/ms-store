import {currencyConverter} from './modules/currency-converter.js';
import {marketsComparator} from './modules/markets-comparator.js';
import dataUpdater from './modules/data-updater.js';
import GamesModificator from './modules/games-modificator.js';
import fileManager from './modules/file-manager.js';
// @ts-ignore
import Tgfancy from 'tgfancy';
import feeCalculator from './modules/fee-calculator.js';
import {Game} from './types/entities.js';
import {globalFinder} from './modules/global-finder.js';

let gamesModificator: GamesModificator;
const helpText = 
`/list - Сформировать список из N (по умолчанию 200) наиболее популярных игр
Пример: /list 100

/listall - Сформировать список из всех игр на распродаже

/refresh_currencies - Обновить курсы валют
Для применения новых валют потребуется обновить список игр
Крайне не рекомендуется злоупотреблять: сервер с валютами агрессивно реагирует на частые запросы

/refresh_games - Обновить список игр
Получение списка игр со всех рынков и составление списка самых дешёвых игр
Может потребоваться продолжительное время, поэтому рекомендуется не злоупотреблять

/find - Найти игру по части названия
Вернёт список игр, содержащих искомую подстроку
Пример: find halo

/setrule - Установить новое правило наценки на игры
На данный момент поддерживается четыре типа наценки:
1. Абсолютная величина. Пример: /setrule 150.50
2. Относительная величина. Пример: /setrule 20%
3. Диапазоны с абсолютной величиной. Пример:
/setrule
0 500 85.0
500 700 135.0
700 1400 140
1400 2000 150
4. Диапазоны с относительной величиной. Пример:
/setrule
0 500 50.0%
500 700 35%
700 1400 25%
1400 2000 10%

/when - Узнать, когда обновлялись курсы валют и список игр

/help - Получить данное сообщение`;

const token = '2106918560:AAHcDnYBpR5qQrCYJLp_mmfXAJPSjYkSlac';
const fancyBot = new Tgfancy(token, {
  polling: true,
  tgfancy: {textPaging: true}
});

async function initData() {
  try {
    await currencyConverter.init();
    await marketsComparator.init();

    const cheapestGames: Game[] = marketsComparator.getCheapestGames();
    const isCheapestGamesLoaded = cheapestGames.length !== 0;
    console.log('isCheapestGamesLoaded', isCheapestGamesLoaded);

    gamesModificator = new GamesModificator(cheapestGames);
    await gamesModificator.init();
    console.log('GamesModificator init');
  } catch (e) {
    console.error('Error at init:', e);
  }
}

let passwords = fileManager.readData('auth/passwords');
const approvedUsers = fileManager.readData('auth/users') || [];
const checkUser = (chatId: string) => {
  if (approvedUsers.find(({chatId: approvedChatId}: {chatId: string}) => approvedChatId === chatId)) {
    return true;
  }

  fancyBot.sendMessage(chatId, 'Чтобы получить доступ к функциям бота введите ключ в формате команды:\n/password key');
  return false;
}

initData().then(() => {
  console.log('bot init');
  fancyBot.onText(/^\/password ?(.*)$/, async ({chat}: {chat: any}, [_, password]: [_: any, password: string]) => {
    if (passwords.includes(password)) {
      console.log('/password', password, chat.id, `@${chat.username}`);
      passwords = passwords.filter((pass: string) => pass !== password);
      fileManager.writeData('auth/passwords', passwords);
      approvedUsers.push({chatId: chat.id, password});
      fileManager.writeData('auth/users', approvedUsers);
      fancyBot.sendMessage(chat.id, 'Авторизация успешна!');
      return;
    }

    fancyBot.sendMessage(chat.id, 'Ключ не подходит!');
  });

  fancyBot.onText(/^\/list ?(\d*)/, async ({chat}: {chat: any}, [_, limit]: [_: any, limit: string]) => {
    console.log('/list', limit, chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;
    const list = gamesModificator.getReadableList(+limit || undefined);
    fancyBot.sendMessage(chat.id, list || 'Список игр пуст :(');
  });

  fancyBot.onText(/^\/listall/, async ({chat}: {chat: any}) => {
    console.log('/listall', chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;
    const list = gamesModificator.getReadableList(0);
    fancyBot.sendMessage(chat.id, list || 'Список игр пуст :(');
  });

  fancyBot.onText(/^\/refresh_currencies$/, async ({chat}: {chat: any}) => {
    console.log('/refresh_currencies', chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;

    try {
      dataUpdater.checkForUpdate('currencies');
      fancyBot.sendMessage(chat.id, 'Пожалуйста, подождите. Это может занять время...');
    } catch (error) {
      console.error('/refresh_currencies', error);
      fancyBot.sendMessage(chat.id, error);
      return;
    }

    dataUpdater.update('currencies')
      .then(() => fancyBot.sendMessage(chat.id, 'Курсы валют успешно обновлены'))
      .catch(error => {
        console.error('/refresh_currencies', error);
        fancyBot.sendMessage(chat.id, error);
      });
  });

  fancyBot.onText(/^\/refresh_games$/, async ({chat}: {chat: any}) => {
    console.log('/refresh_games', chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;

    try {
      dataUpdater.checkForUpdate('markets');
      fancyBot.sendMessage(chat.id, 'Пожалуйста, подождите. Процесс займёт несколько минут!');
    } catch (error) {
      console.error('/refresh_games', error);
      fancyBot.sendMessage(chat.id, error);
      return;
    }

    try {
      await dataUpdater.update('markets');
    } catch (error) {
      console.error('/refresh_games', error);
      fancyBot.sendMessage(chat.id, error);
      return;
    }

    try {
      const cheapestGames: Game[] = marketsComparator.getCheapestGames();
      console.debug('/refresh_games after marketsComparator.getCheapestGames');
      gamesModificator = new GamesModificator(cheapestGames);
      await gamesModificator.init();
      console.debug('/refresh_games after GamesModificator.setGames(Object.values(cheapestGames))');
      fancyBot.sendMessage(chat.id, 'Обновление завершено!');
    } catch (error) {
      console.error(`/refresh_games`, error);
      fancyBot.sendMessage(chat.id, 'Обновление не удалось, попробуйте ещё раз :(');
    }
  });

  fancyBot.onText(/^\/find$/, async ({chat}: {chat: any}) => {
    console.log(`/find`, chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;
    fancyBot.sendMessage(chat.id, 'Параметром поиска игры должна быть строка');
  });

  fancyBot.onText(/^\/find (.*)$/, async ({chat}: {chat: any}, [_, query]: [_: any, query: string]) => {
    console.log(`/find ${query}`, chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;
    const foundGames = gamesModificator.findGames(query);
    fancyBot.sendMessage(chat.id, foundGames);
  });

  fancyBot.onText(/^\/findglobal ?(.*)$/, async ({chat}: {chat: any}, [_, query]: [_: any, query: string]) => {
    console.log(`/findglobal ${query}`, chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;

    fancyBot.sendMessage(chat.id, 'Подождите, осуществляется поиск...');
    try {
      const foundGames = await globalFinder.getCheapestGamesByQuery(query);
      if (foundGames.length === 0) {
        fancyBot.sendMessage(chat.id, 'Не удалось найти игры по данному запросу.');
        return;
      }

      const localGamesModificator = new GamesModificator(foundGames);
      const list = localGamesModificator.getReadableList(0, true);
      fancyBot.sendMessage(chat.id, list);
    } catch (error) {
      console.error('', error);
      fancyBot.sendMessage(chat.id, 'При поиске игр произошла ошибка!');
    }
  });

  fancyBot.onText(/^\/setrule/, async ({chat}: {chat: any}, msg: any) => {
    const query = msg.input.replace(/^\/setrule\s/, '');
    console.log(`/setrule ${query}`, chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;

    try {
      feeCalculator.setRuleFromText(query);
      fancyBot.sendMessage(chat.id, 'Новые правила установлены!');
    } catch(e) {
      console.error('Failed to set new rules', e);
      fancyBot.sendMessage(chat.id, 'Проверьте правильность написания правил! Помощь: /help.');
    }
  });

  fancyBot.onText(/^\/when$/, async ({chat}: {chat: any}) => {
    console.log(`/when`, chat.id, `@${chat.username}`);

    const messageResponse = [dataUpdater.when('currencies'), dataUpdater.when('markets')].join('\n');
    fancyBot.sendMessage(chat.id, messageResponse);
  });

  fancyBot.onText(/^\/help$/, async ({chat}: {chat: any}) => {
    console.log(`/help`, chat.id, `@${chat.username}`);
    if (!checkUser(chat.id)) return;
    fancyBot.sendMessage(chat.id, helpText);
  });

  fancyBot.onText(/^\/getlog$/, ({chat}: {chat: any}) => {
    console.log(`/getlog`, chat.id, `@${chat.username}`);
    if (!checkUser(chat.id) || chat.username !== 'DmitryNevada') return;

    const logPath = fileManager.getFileFullPath('log');
    fancyBot.sendDocument(chat.id, logPath)
      .then(() => {
        fileManager.clearFile(logPath);
        fancyBot.sendMessage(chat.id, 'Журнал очищен.');
      })
      .catch(() => {
        fancyBot.sendMessage(chat.id, 'Журнал записей отсутствует или пуст.');
      });
  });
});

process.on('unhandledRejection', error => {
  console.error('unhandledRejection', error);
});
