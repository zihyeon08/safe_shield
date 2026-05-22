import { NextResponse } from "next/server";
import { localPreCheck } from "@/lib/algorithms";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: "텍스트가 입력되지 않았습니다." },
        { status: 400 }
      );
    }

    // 1. Local Pre-check
    const localData = localPreCheck(text);

    // 2. Call Gemini API
    if (!GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Mocking response for MVP.");
      // Fallback/Mock logic if no API key
      const mockResult = {
        risk_score: localData.localRiskScore > 0 ? localData.localRiskScore : 10,
        risk_level: localData.localRiskScore > 70 ? "위험" : localData.localRiskScore > 30 ? "주의" : "안전",
        reasons: localData.localReasons.length > 0
          ? localData.localReasons.join(" ")
          : "안전해 보입니다. 공식 은행 도메인이거나 의심스러운 키워드가 없습니다.",
        localData,
      };
      return NextResponse.json(mockResult);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemInstruction = `
당신은 시니어를 위한 금융 범죄 예방 AI입니다.
사용자가 입력한 텍스트(문자, 링크, 전화번호 등)를 분석하여 보이스피싱, 스미싱 위험도를 0~100점 사이로 평가하세요.
다음의 형식의 순수 JSON만 반환하세요.
{
  "risk_score": 0~100,
  "risk_level": "안전" | "주의" | "위험",
  "reasons": "시니어가 이해하기 쉬운 한국어로, 왜 위험한지 3문장 이내로 작성"
}
참고: 070번호, 링크, '대출', '청첩장', '부고', '자녀사칭(엄마 폰 고장났어)' 등이 있으면 위험 점수를 높게 주세요.
`;

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          parts: [
            {
              text: `분석할 텍스트: "${text}"\n\n로컬 사전 분석 결과(참고용): ${JSON.stringify(
                localData
              )}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Request Failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    const aiResult = JSON.parse(responseText);

    // 3. Fallback logic if API says safe but local says very dangerous
    let finalScore = aiResult.risk_score;
    if (localData.localRiskScore >= 80 && finalScore < 50) {
      finalScore = 85;
      aiResult.risk_level = "위험";
      aiResult.reasons =
        localData.localReasons.join(" ") + " 절대 링크를 누르지 마세요.";
    }

    return NextResponse.json({
      risk_score: finalScore,
      risk_level: aiResult.risk_level,
      reasons: aiResult.reasons,
      localData,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "일시적인 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
