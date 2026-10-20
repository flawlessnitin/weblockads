type Rule = chrome.declarativeNetRequest.Rule;

export function postProcessRules(
  rulesets: Record<string, Rule[]>,
  opts: { regexBudget: number },
): { rulesets: Record<string, Rule[]>; dropped: { redirect: number; regexOverBudget: number } } {
  const output: Record<string, Rule[]> = {};
  const dropped = { redirect: 0, regexOverBudget: 0 };
  let regexCount = 0;
  for (const [id, rules] of Object.entries(rulesets)) {
    const kept: Rule[] = [];
    for (const rule of rules) {
      if (rule.action.type === 'redirect') { dropped.redirect++; continue; }
      if (rule.condition.regexFilter !== undefined) {
        if (regexCount >= opts.regexBudget) { dropped.regexOverBudget++; continue; }
        regexCount++;
      }
      kept.push({ ...structuredClone(rule), id: kept.length + 1 });
    }
    output[id] = kept;
  }
  return { rulesets: output, dropped };
}
