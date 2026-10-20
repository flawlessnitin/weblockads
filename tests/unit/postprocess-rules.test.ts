import { describe, expect, it } from 'vitest';
import { postProcessRules } from '../../scripts/postprocess-rules';

type Rule = chrome.declarativeNetRequest.Rule;
const block = (id: number, condition: Rule['condition'] = { urlFilter: 'ad.example' }): Rule => ({
  id, action: { type: 'block' as Rule['action']['type'] }, condition,
});

describe('postProcessRules', () => {
  it('removes and counts redirect rules', () => {
    const redirect: Rule = { id: 9, action: { type: 'redirect' as Rule['action']['type'], redirect: { url: 'https://example.com/' } }, condition: {} };
    const result = postProcessRules({ ublock: [redirect, block(10)] }, { regexBudget: 1000 });
    expect(result.rulesets.ublock).toHaveLength(1);
    expect(result.rulesets.ublock[0].action.type).toBe('block');
    expect(result.dropped.redirect).toBe(1);
  });
  it('shares the regex budget across rulesets with earlier rulesets first', () => {
    const result = postProcessRules({
      ublock: [block(10, { regexFilter: 'first' }), block(11)],
      easylist: [block(20, { regexFilter: 'second' }), block(21, { regexFilter: 'third' }), block(22)],
    }, { regexBudget: 2 });
    expect(result.rulesets.ublock.map((rule) => rule.condition.regexFilter)).toEqual(['first', undefined]);
    expect(result.rulesets.easylist.map((rule) => rule.condition.regexFilter)).toEqual(['second', undefined]);
    expect(result.dropped.regexOverBudget).toBe(1);
  });
  it('renumbers ids 1..n within each ruleset', () => {
    const result = postProcessRules({ ublock: [block(30), block(50)], easylist: [block(300)] }, { regexBudget: 1000 });
    expect(result.rulesets.ublock.map((rule) => rule.id)).toEqual([1, 2]);
    expect(result.rulesets.easylist.map((rule) => rule.id)).toEqual([1]);
  });
  it('does not mutate the input', () => {
    const input = { ublock: [block(50, { regexFilter: 'ad' }), block(100)] };
    const before = structuredClone(input);
    const result = postProcessRules(input, { regexBudget: 0 });
    expect(input).toEqual(before);
    result.rulesets.ublock[0].condition.urlFilter = 'changed';
    expect(input).toEqual(before);
  });
});
