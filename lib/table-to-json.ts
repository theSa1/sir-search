import { Cheerio, load } from "cheerio";

export const tableToJSON = (
  $: ReturnType<typeof load>,
  table: Cheerio<any>,
  options: {
    useFirstRowForHeadings: boolean;
    headings: string[];
  }
) => {
  const { useFirstRowForHeadings, headings = [] } = options;
  const trs = table.find("tr");
  const rowCount = trs.length;
  const output = [] as any[];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const tagName = rowIndex === 0 && useFirstRowForHeadings ? "th" : "td";
    const children = $(trs[rowIndex]).find(tagName);
    const colCount = children.length;
    const row: Record<string | number, string> = {};

    for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
      const td = $(children[colIndex]);

      if (rowIndex === 0 && useFirstRowForHeadings) {
        headings.push(td.text());
      } else {
        row[headings[colIndex] || colIndex] = td.text();
      }
    }

    if (!(rowIndex === 0 && useFirstRowForHeadings)) {
      output.push(row);
    }
  }
  return output;
};
