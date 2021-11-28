import {RuleType, SimpleFeeRule, RangesFeeRule} from '../types/entities.js';

class FeeCalculator {
  ruleType: RuleType = RuleType.AbsoluteRanges;
  rules: SimpleFeeRule | RangesFeeRule[] = [
    {from: 0, to: 500, fee: 85},
    {from: 500, to: 700, fee: 135},
    {from: 700, to: 1400, fee: 140},
    {from: 1400, to: 2000, fee: 150},
  ];

  setRuleFromText(rule: string): void {
    const isRuleRange = rule.includes(' ');
    const isRuleRelative = rule.includes('%');

    this.ruleType = isRuleRange
      ? isRuleRelative ? RuleType.RelativeRanges : RuleType.AbsoluteRanges
      : isRuleRelative ? RuleType.Relative : RuleType.Absolute;

    switch (this.ruleType) {
      case RuleType.Absolute:
        this.rules = parseFloat(rule);
        break;
      case RuleType.Relative:
        this.rules = parseInt(rule) / 100;
        break;
      case RuleType.AbsoluteRanges:
        this.rules = rule.split('\n').map((range: string): RangesFeeRule => {
          const [from, to, fee] = range.split(' ').map(n => parseFloat(n));
          return {from, to, fee};
        });
        break;
      case RuleType.RelativeRanges:
        this.rules = rule.split('\n').map((range: string): RangesFeeRule => {
          const [from, to, fee] = range.split(' ').map(n => parseFloat(n));
          return {from, to, fee: fee / 100};
        });
        break;
    }
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
}

export default new FeeCalculator();
