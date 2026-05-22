import {
  extractUrls,
  extractPhones,
  levenshteinDistance,
  localPreCheck,
  getDomainFromUrl,
} from "../algorithms";

describe("Algorithms Unit Tests", () => {
  describe("extractUrls", () => {
    it("should extract a single URL", () => {
      const text = "여기 링크를 클릭하세요: https://example.com/login";
      expect(extractUrls(text)).toEqual(["https://example.com/login"]);
    });

    it("should extract multiple URLs", () => {
      const text = "링크1: http://a.com, 링크2: www.b.co.kr/test";
      const urls = extractUrls(text);
      expect(urls.length).toBeGreaterThanOrEqual(2);
      expect(urls).toContain("http://a.com");
      expect(urls).toContain("www.b.co.kr/test");
    });

    it("should return empty array if no URL", () => {
      expect(extractUrls("안녕하세요. 국민은행입니다.")).toEqual([]);
    });
  });

  describe("extractPhones", () => {
    it("should extract various phone formats", () => {
      const text = "문의: 1588-9999 또는 010-1234-5678, 인터넷 070-1234-5678";
      const phones = extractPhones(text);
      expect(phones).toContain("1588-9999");
      expect(phones).toContain("010-1234-5678");
      expect(phones).toContain("070-1234-5678");
    });

    it("should return empty array if no phone number", () => {
      expect(extractPhones("전화번호가 없는 텍스트입니다.")).toEqual([]);
    });
  });

  describe("levenshteinDistance & getDomainFromUrl", () => {
    it("should calculate correct distance", () => {
      expect(levenshteinDistance("kbstar.com", "kbstar.com")).toBe(0);
      expect(levenshteinDistance("kbstar.com", "kbstarr.com")).toBe(1);
      expect(levenshteinDistance("kbstar.com", "kb-star.com")).toBe(1);
      expect(levenshteinDistance("kbstar.com", "naver.com")).toBeGreaterThan(3);
    });

    it("should extract domain correctly", () => {
      expect(getDomainFromUrl("https://www.kbstar.com/login")).toBe("kbstar.com");
      expect(getDomainFromUrl("http://kbstar.com")).toBe("kbstar.com");
      expect(getDomainFromUrl("kbstar.com")).toBe("kbstar.com");
    });
  });

  describe("localPreCheck", () => {
    it("should return safety for official phone and no urls", () => {
      const res = localPreCheck("국민은행입니다. 1588-9999로 전화주세요.");
      expect(res.localRiskScore).toBe(0);
      expect(res.localReasons.length).toBe(0);
    });

    it("should penalize 070 numbers", () => {
      const res = localPreCheck("대출안내 070-1234-5678");
      expect(res.localRiskScore).toBeGreaterThanOrEqual(40);
      expect(res.localReasons.some(r => r.includes("070"))).toBe(true);
    });

    it("should penalize typosquatting domains", () => {
      // kbstar.com is official, kb-star.com is typo (distance 1)
      const res = localPreCheck("접속: https://kb-star.com");
      expect(res.localRiskScore).toBeGreaterThanOrEqual(80);
      expect(res.localReasons.some(r => r.includes("가짜 주소"))).toBe(true);
    });

    it("should penalize unknown domains", () => {
      const res = localPreCheck("이벤트: https://random-site.xyz");
      expect(res.localRiskScore).toBeGreaterThanOrEqual(30);
      expect(res.localReasons.some(r => r.includes("출처가 불분명"))).toBe(true);
    });
  });
});
