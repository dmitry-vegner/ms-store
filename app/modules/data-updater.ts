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
  autoUpdateInterval: number;
  autoUpdateTimer: NodeJS.Timer | null;
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
      autoUpdateInterval: 20 * 60e3,
      autoUpdateTimer: null,
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
      autoUpdateInterval: 30 * 60e3,
      autoUpdateTimer: null,
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

  constructor() {
    const targets: TargetKey[] = ['currencies', 'markets'];
    targets.forEach(target => this.startTimer(target));
  }

  checkForUpdate(targetKey: TargetKey): void {
    this.checkTarget(targetKey);

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
  }

  async update(targetKey: TargetKey): Promise<void> {
    this.checkForUpdate(targetKey);
    const target = this.targets[targetKey];
    const {messages} = target;

    target.isUpdateInProgress = true;
    try {
      await target.update();
      target.lastUpdate = new Date().getTime();
      target.isUpdateInProgress = false;
      this.startTimer(targetKey);
    } catch (error) {
      target.isUpdateInProgress = false;
      console.error(messages.updateErrorLog, error);
      this.startTimer(targetKey);
      throw messages.updateError;
    }
  }

  stopTimer(targetKey: TargetKey): void {
    this.checkTarget(targetKey);
    const target = this.targets[targetKey];
    if (target.autoUpdateTimer !== null) {
      clearTimeout(target.autoUpdateTimer);
      target.autoUpdateTimer = null;
    }
  }

  startTimer(targetKey: TargetKey): void {
    this.stopTimer(targetKey);
    const target = this.targets[targetKey];
    target.autoUpdateTimer = setTimeout(
      () => this.update(targetKey),
      target.autoUpdateInterval
    );
  }

  when(targetKey: TargetKey): string {
    this.checkTarget(targetKey);

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
    const mLastTwoDigits = m.toString().slice(-2);
    const mLastDigit = m.toString().slice(-1);
    const mWord =
      ['11', '12', '13', '14'].includes(mLastTwoDigits) ? 'минут' :
      ['0', '5', '6', '7', '8', '9'].includes(mLastDigit) ? 'минут' :
      ['1'].includes(mLastDigit) ? 'минуту' : 'минуты';
    const mPart = m === 0 ? `` : `${m} ${mWord}`;

    const sLastTwoDigits = s.toString().slice(-2);
    const sLastDigit = s.toString().slice(-1);
    const sWord =
      ['11', '12', '13', '14'].includes(sLastTwoDigits) ? 'секунд' :
      ['0', '5', '6', '7', '8', '9'].includes(sLastDigit) ? 'секунд' :
      ['1'].includes(sLastDigit) ? 'секунду' : 'секунды';
    const sPart = s === 0 ? `` : `${s} ${sWord}`;

    if (mPart === '' && sPart === '') return `только что`;
    if (mPart !== '' && sPart !== '') return `${mPart} и ${sPart} назад`;
    return `${mPart || sPart} назад`;
  }

  private checkTarget(targetKey: TargetKey): void {
    if (!['currencies', 'markets'].includes(targetKey)) {
      throw this.INCORRECT_TARGET_MESSAGE;
    }
  }
}

export default new DataUpdater();
