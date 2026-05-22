export const whitelist = {
  domains: [
    "kbstar.com",
    "shinhan.com",
    "wooribank.com",
    "hanabank.com",
    "ibk.co.kr",
    "nhbank.com",
  ],
  phones: [
    "1588-9999",
    "1599-8000",
    "1588-5000",
    "1599-1111",
    "1566-2566",
    "1661-3000",
    "1588-2100",
  ],
};

export function extractUrls(text: string): string[] {
  const urlRegex =
    /(https?:\/\/[^\s,]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s,]*)?)/g;
  return text.match(urlRegex) || [];
}

export function extractPhones(text: string): string[] {
  const phoneRegex = /(?:0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4})/g;
  return text.match(phoneRegex) || [];
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

export function getDomainFromUrl(url: string): string {
  try {
    if (!url.startsWith("http")) url = "http://" + url;
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export interface LocalAnalysisData {
  urls: string[];
  phones: string[];
  localRiskScore: number;
  localReasons: string[];
}

export function localPreCheck(text: string): LocalAnalysisData {
  const urls = extractUrls(text);
  const phones = extractPhones(text);

  let localRiskScore = 0;
  let reasons: string[] = [];

  // 1. Phone number check
  if (phones.length > 0) {
    let foundInWhitelist = false;
    for (const p of phones) {
      if (whitelist.phones.includes(p.replace(/-/g, ""))) {
        foundInWhitelist = true;
      }
      if (whitelist.phones.includes(p)) {
        foundInWhitelist = true;
      }
      if (p.startsWith("070")) {
        localRiskScore += 40;
        reasons.push("해외/인터넷 전화(070)가 포함되어 있습니다.");
      }
    }
    if (!foundInWhitelist && phones.length > 0 && !phones[0].startsWith("010")) {
      localRiskScore += 20;
      reasons.push("공식 금융기관 전화번호가 아닙니다.");
    }
  }

  // 2. Domain check
  if (urls.length > 0) {
    let minDistance = 999;
    let matchedDomain = "";
    const inputDomain = getDomainFromUrl(urls[0]);

    for (const wd of whitelist.domains) {
      const dist = levenshteinDistance(inputDomain, wd);
      if (dist < minDistance) {
        minDistance = dist;
        matchedDomain = wd;
      }
    }

    if (minDistance === 0) {
      localRiskScore = 0;
    } else if (minDistance > 0 && minDistance <= 3) {
      localRiskScore += 80;
      reasons.push(
        `공식 사이트(${matchedDomain})와 교묘하게 비슷한 가짜 주소입니다.`
      );
    } else {
      localRiskScore += 30;
      reasons.push("출처가 불분명한 링크가 포함되어 있습니다.");
    }
  }

  return {
    urls,
    phones,
    localRiskScore,
    localReasons: reasons,
  };
}
