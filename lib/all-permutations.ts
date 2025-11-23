export const permuteReplacements = (str: string): string[] => {
  const results = new Set<string>();

  const rules = [
    { from: "ુ", to: "ૂ" },
    { from: "ૂ", to: "ુ" },
    { from: "િ", to: "ી" },
    { from: "ી", to: "િ" },
    { from: "શ", to: "ષ" },
    { from: "ષ", to: "શ" },
    { from: "શ", to: "સ" },
    { from: "ષ", to: "સ" },
    { from: "સ", to: "શ" },
    { from: "સ", to: "ષ" },
  ];

  function helper(s: string, index: number) {
    if (index >= s.length) {
      results.add(s);
      return;
    }

    let matched = false;

    for (const { from, to } of rules) {
      if (s.startsWith(from, index)) {
        matched = true;

        // Option 1: keep it as is
        helper(s, index + from.length);

        // Option 2: replace it
        const newStr = s.slice(0, index) + to + s.slice(index + from.length);
        helper(newStr, index + to.length);
      }
    }

    // If nothing matched, just advance
    if (!matched) {
      helper(s, index + 1);
    }
  }

  helper(str, 0);
  return Array.from(results);
};
