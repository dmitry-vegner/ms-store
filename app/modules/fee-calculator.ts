import {RuleType, SimpleFeeRule, RangesFeeRule} from '../types/entities.js';
import fileManager from './file-manager.js';

const DEFAULT_RULE_TYPE: RuleType = RuleType.AbsoluteRanges;
const DEFAULT_RULES: RangesFeeRule[] = [
  {from: 0, to: 500, fee: 85},
  {from: 500, to: 700, fee: 135},
  {from: 700, to: 1400, fee: 140},
  {from: 1400, to: 2000, fee: 150},
];

class FeeCalculator {
  ruleType: RuleType = DEFAULT_RULE_TYPE;
  rules: SimpleFeeRule | RangesFeeRule[] = DEFAULT_RULES;

  constructor() {
    try {
      this.readRulesFromFile();
    } catch (_) {}
  }

  getRuleByQuery(query: string, ruleType?: RuleType): SimpleFeeRule | RangesFeeRule[] {
    ruleType = ruleType ?? this.getRuleTypeFromQuery(query);
    switch (ruleType) {
      case RuleType.AbsoluteRanges:
        return query.split('\n').map((range: string): RangesFeeRule => {
          const [from, to, fee] = range.split(' ').map(n => parseFloat(n));
          return {from, to, fee};
        });
      case RuleType.RelativeRanges:
        return query.split('\n').map((range: string): RangesFeeRule => {
          const [from, to, fee] = range.split(' ').map(n => parseFloat(n));
          return {from, to, fee: fee / 100};
        });
      case RuleType.Relative:
        return parseInt(query) / 100;
      default:
        return parseFloat(query) || 0;
    }
  }

  getRuleTypeFromQuery(query: string): RuleType {
    const isRuleRange = query.includes(' ');
    const isRuleRelative = query.includes('%');

    const ruleType: RuleType = isRuleRange
      ? isRuleRelative ? RuleType.RelativeRanges : RuleType.AbsoluteRanges
      : isRuleRelative ? RuleType.Relative : RuleType.Absolute;

    if (ruleType === RuleType.Absolute && isNaN(parseFloat(query))) {
      throw 'Правило для формирования наценки написано некорректно!';
    }

    return ruleType;
  };

  setRuleFromText(query: string): void {
    this.ruleType = this.getRuleTypeFromQuery(query);
    this.rules = this.getRuleByQuery(query, this.ruleType);
    this.saveRulesToFile();
  }

  getTaxedPrice(basePrice: number): number {
    let fee = 0;

    if (typeof this.rules === 'number') {
      if (this.ruleType === RuleType.Absolute) {
        // rules is a number from 0
        fee = this.rules;
      }

      if (this.ruleType === RuleType.Relative) {
        // rules is a number from 0.00 to 1.00
        fee = basePrice * this.rules;
      }
    }

    if (typeof this.rules === 'object') {
      const maxFee = this.rules.sort((a, b) => b.fee - a.fee)[0].fee || 0;
      const targetRange: RangesFeeRule | undefined = this.rules.find(({from, to}) => from <= basePrice && basePrice <= to);

      if (this.ruleType === RuleType.AbsoluteRanges) {
        // targetRange.fee is a number from 0
        fee = targetRange?.fee || maxFee;
      }

      if (this.ruleType === RuleType.RelativeRanges) {
        // targetRange.fee is a number from 0.00 to 1.00
        fee = basePrice * (targetRange?.fee || 0);
      }
    }

    return Math.floor(basePrice + fee);
  }

  private saveRulesToFile(): void {
    fileManager.writeData('fee-info', {
      type: this.ruleType,
      rules: this.rules,
    });
  }

  private readRulesFromFile(): void {
    const info = fileManager.readData('fee-info');
    this.ruleType = info?.type || this.ruleType;
    this.rules = info?.rules || this.rules;

    if (info === null) {
      this.saveRulesToFile();
      throw 'Чтение правил начисления комиссии из файла не удалось.';
    }
  }
}

export default new FeeCalculator();
