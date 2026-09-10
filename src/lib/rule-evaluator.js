// jPit Domain Rule Evaluator Engine

class RuleEvaluator {
  static wildcardToRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regexStr = '^' + escaped.replace(/\\\*/g, '.*') + '$';
    return new RegExp(regexStr, 'i');
  }

  static matchesDomain(hostname, pattern, matchType = 'wildcard') {
    if (!hostname || !pattern) return false;
    pattern = pattern.trim();
    
    if (matchType === 'exact') {
      return hostname.toLowerCase() === pattern.toLowerCase();
    }
    
    if (matchType === 'regex') {
      try {
        const re = new RegExp(pattern, 'i');
        return re.test(hostname);
      } catch (e) {
        console.warn('[jPit] Invalid regex rule:', pattern, e);
        return false;
      }
    }

    // Default wildcard matching
    const re = this.wildcardToRegex(pattern);
    return re.test(hostname);
  }

  static evaluateUrl(url, rulesList = [], defaultMode = 'smart_auto') {
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {
      return { active: true, unblockPaste: true, unblockCopy: true, unblockContextMenu: false, unblockSelection: false };
    }

    // Check specific custom rules first
    for (const rule of rulesList) {
      if (this.matchesDomain(hostname, rule.pattern, rule.matchType)) {
        return {
          active: true,
          unblockPaste: rule.unblockPaste ?? true,
          unblockCopy: rule.unblockCopy ?? true,
          unblockContextMenu: rule.unblockContextMenu ?? false,
          unblockSelection: rule.unblockSelection ?? false
        };
      }
    }

    // Default behavior modes
    if (defaultMode === 'disabled') {
      return { active: false, unblockPaste: false, unblockCopy: false, unblockContextMenu: false, unblockSelection: false };
    }

    if (defaultMode === 'aggressive') {
      return { active: true, unblockPaste: true, unblockCopy: true, unblockContextMenu: true, unblockSelection: true };
    }

    // Smart Auto Mode (Default): Paste and Copy unblocked, Context menu & selection safe by default
    return { active: true, unblockPaste: true, unblockCopy: true, unblockContextMenu: false, unblockSelection: false };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RuleEvaluator;
} else {
  globalThis.RuleEvaluator = RuleEvaluator;
}
