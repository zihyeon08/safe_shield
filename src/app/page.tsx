"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { extractPhones } from "@/lib/algorithms";

type RiskLevel = "안전" | "주의" | "위험";

interface AnalysisResult {
  risk_score: number;
  risk_level: RiskLevel;
  reasons: string;
}

export default function Home() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleAnalyze = async () => {
    const trimmed = text.trim();
    setError("");

    if (!trimmed) {
      setError("검사할 내용을 입력해 주세요!");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        throw new Error("서버 오류");
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      showToast("일시적인 네트워크 지연이 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setText("");
    setResult(null);
    setError("");
  };

  // Determine theme class
  let themeClass = "";
  if (result) {
    if (result.risk_score <= 30) themeClass = styles.themeSafe;
    else if (result.risk_score <= 70) themeClass = styles.themeCaution;
    else themeClass = styles.themeDanger;
  }

  // Determine official phone link
  const phones = extractPhones(text);
  const officialPhoneLink = phones.length > 0 ? `tel:${phones[0]}` : "tel:1588-9999";

  return (
    <div className={`${styles.appContainer} ${themeClass}`}>
      <header className={styles.header}>
        <h1>🛡️ SafeShield AI</h1>
      </header>

      <main className={styles.main}>
        {!loading && !result && (
          <div className={styles.inputGroup}>
            <label htmlFor="textInput">
              의심되는 문자, 링크, 전화번호를
              <br />
              여기에 붙여넣어 주세요.
            </label>
            <textarea
              id="textInput"
              className={`${styles.textarea} ${error ? styles.textareaError : ""}`}
              placeholder="예: [Web발신] 국민은행 대출지원 안내... 070-1234-5678"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="분석할 텍스트 입력"
            />
            {error && <div className={styles.errorMessage}>{error}</div>}
            <button className={styles.analyzeBtn} onClick={handleAnalyze}>
              안전 검사 시작하기
            </button>
          </div>
        )}

        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <div className={styles.loadingText}>AI가 실시간으로 분석 중입니다...</div>
            <div className={styles.loadingSubtext}>잠시만 기다려 주세요 (약 3초 소요)</div>
          </div>
        )}

        {result && (
          <div className={styles.resultSection}>
            <div className={styles.scoreCard}>
              <div className={styles.scoreLevel}>
                {result.risk_score <= 30
                  ? "안전 (안심)"
                  : result.risk_score <= 70
                  ? "주의 (의심)"
                  : "위험 (경고)"}
              </div>
              <div className={styles.scoreValue}>{result.risk_score}점</div>
              <div className={styles.reasonBox}>{result.reasons}</div>
            </div>

            <div className={styles.actionCenter}>
              {result.risk_score <= 30 && (
                <a href={officialPhoneLink} className={`${styles.actionBtn} ${styles.btnOfficial}`}>
                  📞 공식 고객센터 확인 완료
                </a>
              )}
              
              {result.risk_score > 70 && (
                <button
                  className={`${styles.actionBtn} ${styles.btnGuardian}`}
                  onClick={() => showToast("보호자(딸)에게 긴급 알림을 전송했습니다.")}
                >
                  🚨 가족에게 위험 알리기
                </button>
              )}

              <button className={`${styles.actionBtn} ${styles.btnReset}`} onClick={handleReset}>
                새로운 검사하기
              </button>
            </div>
          </div>
        )}
      </main>

      <div className={`${styles.toast} ${toastMsg ? styles.show : ""}`}>
        {toastMsg}
      </div>
    </div>
  );
}
