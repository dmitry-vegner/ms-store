import {currencyConverter} from './currency-converter.js';
import {marketsComparator} from './markets-comparator.js';

type TargetKey = 'currencies' | 'markets';

interface AsyncUpdateFunction {
  (): Promise<void>;
}

interface Messages {
  inProgress: string;
  tooRecently: string;
  updateError: string;
  updateErrorLog: string;
}

interface Target {
  safeInterval: number;
  lastUpdate: number;
  isUpdateInProgress: boolean;
  update: AsyncUpdateFunction;
  messages: Messages;
}

type Targets = {
  [targetKey in TargetKey]: Target;
};

class DataUpdater {
  private readonly INCORRECT_TARGET_MESSAGE = 'Выбрана некорректная цель.';
  private targets: Targets = {
    currencies: {
      safeInterval: 5 * 60e3,
      lastUpdate: 0,
      isUpdateInProgress: false,
      update: async () => currencyConverter.refreshCurrencies(),
      messages: {
        inProgress: 'Курсы валют уже обновляются.',
        tooRecently: 'Курсы валют уже обновлялись недавно.',
        updateError: 'Ошибка обновления курсов валют.',
        updateErrorLog: 'Error at currency update',
      },
    },
    markets: {
      safeInterval: 15 * 60e3,
      lastUpdate: 0,
      isUpdateInProgress: false,
      update: async () => marketsComparator.refreshMarkets(),
      messages: {
        inProgress: 'Список игр уже обновляется.',
        tooRecently: 'Список игр уже обновлялся недавно.',
        updateError: 'Ошибка обновления списка игр.',
        updateErrorLog: 'Error at markets update',
      },
    }
  };

  async update(targetKey: TargetKey): Promise<void> {
    if (!['currencies', 'markets'].includes(targetKey)) {
      throw this.INCORRECT_TARGET_MESSAGE;
    }

    const target = this.targets[targetKey];
    const {isUpdateInProgress, messages} = target;

    if (isUpdateInProgress) {
      throw messages.inProgress;
    }

    const {lastUpdate, safeInterval} = target;
    const curTime = new Date().getTime();

    if (curTime - lastUpdate < safeInterval) {
      throw messages.tooRecently;
    }

    target.isUpdateInProgress = true;
    try {
      await target.update();
      target.lastUpdate = new Date().getTime();
      target.isUpdateInProgress = false;
    } catch (error) {
      target.isUpdateInProgress = false;
      console.error(messages.updateErrorLog, error);
      throw messages.updateError;
    }
  }

  when(targetKey: TargetKey): string {
    if (!['currencies', 'markets'].includes(targetKey)) {
      throw this.INCORRECT_TARGET_MESSAGE;
    }

    const {lastUpdate} = this.targets[targetKey];
    const targetName = {currencies: 'курсов валют', markets: 'списка игр'}[targetKey];

    if (lastUpdate === 0) {
      return `Обновление ${targetName} не производилось.`;
    }

    const secondsPassed = Math.round((new Date().getTime() - lastUpdate) / 1e3);
    const m = Math.floor(secondsPassed / 60);
    const s = secondsPassed - m * 60;
    return `Последнее обновление ${targetName} было ${this.getBeatyTime(m, s)}.`;
  }

  private getBeatyTime(m: number, s: number): string {
    const mLastNumber = m.toString().slice(-1);
    const mWord =
      ['0', '5', '6', '7', '8', '9'].includes(mLastNumber) ? 'минут' :
      ['1'].includes(mLastNumber) ? 'минуту' : 'минуты';
    const mPart = m === 0 ? `` : `${m} ${mWord}`;

    const sLastNumber = s.toString().slice(-1);
    const sWord =
      ['0', '5', '6', '7', '8', '9'].includes(sLastNumber) ? 'секунд' :
      ['1'].includes(sLastNumber) ? 'секунду' : 'секунды';
    const sPart = s === 0 ? `` : `${s} ${sWord}`;

    if (mPart === '' && sPart === '') return `только что`;
    if (mPart !== '' && sPart !== '') return `${mPart} и ${sPart} назад`;
    return `${mPart || sPart} назад`;
  }
}

export default new DataUpdater();
