import * as cheerio from "cheerio";
import { tableToJSON } from "./table-to-json";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-GB,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
};

export async function searchElector(
  drpAC: string,
  txtSearch: string,
  txtSearchRelative: string
) {
  const res = await fetch(
    "https://erms.gujarat.gov.in/Search/SearchElectorDB",
    {
      headers: {
        ...headers,
      },
    }
  );
  const cookie = res.headers.get("set-cookie");
  const cleanCookie = cookie?.split(";")[0];
  const text = await res.text();
  const $ = cheerio.load(text);

  const viewState = $("#__VIEWSTATE").val() as string;
  const viewStateGenerator = $("#__VIEWSTATEGENERATOR").val() as string;
  const eventValidation = $("#__EVENTVALIDATION").val() as string;

  const dropdownRes = await fetch(
    "https://erms.gujarat.gov.in/Search/SearchElectorDB",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cleanCookie ?? "",
        ...headers,
      },
      body: new URLSearchParams({
        __LASTFOCUS: "",
        __EVENTTARGET: "DrpAC",
        __EVENTARGUMENT: "",
        __VIEWSTATE: viewState!,
        __VIEWSTATEGENERATOR: viewStateGenerator!,
        __EVENTVALIDATION: eventValidation!,
        DrpAC: drpAC,
        txtSearch: "",
        txtSearchRelative: "",
        txtCaptcha: "",
      }),
    }
  );

  const dropdownText = await dropdownRes.text();
  const $2 = cheerio.load(dropdownText);

  const viewState2 = $2("#__VIEWSTATE").val() as string;
  const viewStateGenerator2 = $2("#__VIEWSTATEGENERATOR").val() as string;
  const eventValidation2 = $2("#__EVENTVALIDATION").val() as string;
  const captcha2 = $2("#lblCaptchaInfo")
    .text()
    .trim()
    .replace("What is ", "")
    .replace("?", "");
  const answer2 = eval(captcha2!);

  const formRes = await fetch(
    "https://erms.gujarat.gov.in/Search/SearchElectorDB",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cleanCookie ?? "",
        ...headers,
      },
      body: new URLSearchParams({
        __LASTFOCUS: "",
        __EVENTTARGET: "btnSearch",
        __EVENTARGUMENT: "",
        __VIEWSTATE: viewState2!,
        __VIEWSTATEGENERATOR: viewStateGenerator2!,
        __EVENTVALIDATION: eventValidation2!,
        DrpAC: drpAC,
        txtSearch: txtSearch,
        txtSearchRelative: txtSearchRelative,
        txtCaptcha: String(answer2),
      }),
    }
  );

  const formText = await formRes.text();

  const $$ = cheerio.load(formText);

  const result = tableToJSON($$, $$("#gvResults"), {
    useFirstRowForHeadings: false,
    headings: [
      "assemblyNo",
      "partNo",
      "serialNo",
      "houseNo",
      "name",
      "relation",
      "relativeName",
      "gender",
      "epicNo",
      "sectionName",
    ],
  }).filter((item) => Object.keys(item).length > 0) as {
    assemblyNo: string;
    partNo: string;
    serialNo: string;
    houseNo: string;
    name: string;
    relation: string;
    relativeName: string;
    gender: string;
    epicNo: string;
    sectionName: string;
  }[];
  const message = $$("#lblResult").text().trim();

  let meta = {
    currentPage: 0,
    totalPages: 0,
    totalRecords: 0,
    message: message,
  };

  if (result.length > 0) {
    const match = message.match(/Page (\d+) of (\d+) — Total Records: (\d+)/);
    if (match) {
      meta.currentPage = parseInt(match[1]!, 10);
      meta.totalPages = parseInt(match[2]!, 10);
      meta.totalRecords = parseInt(match[3]!, 10);
    }
  }

  return { data: result, meta };
}
