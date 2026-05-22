import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "../page";

// Mock fetch API globally
global.fetch = jest.fn();

describe("Home Page Integration Tests", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it("renders correctly and shows error on empty submit", () => {
    render(<Home />);
    
    expect(screen.getByText("🛡️ SafeShield AI")).toBeInTheDocument();
    
    const button = screen.getByRole("button", { name: "안전 검사 시작하기" });
    fireEvent.click(button);
    
    expect(screen.getByText("검사할 내용을 입력해 주세요!")).toBeInTheDocument();
  });

  it("shows loading and renders result on successful API call", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risk_score: 90,
        risk_level: "위험",
        reasons: "위험한 링크가 포함되어 있습니다.",
      }),
    });

    render(<Home />);
    
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "위험한 텍스트" } });
    
    const button = screen.getByRole("button", { name: "안전 검사 시작하기" });
    fireEvent.click(button);

    // Should show loading text initially
    expect(screen.getByText("AI가 실시간으로 분석 중입니다...")).toBeInTheDocument();

    // Wait for the result to appear
    await waitFor(() => {
      expect(screen.getByText("90점")).toBeInTheDocument();
    });

    expect(screen.getByText("위험 (경고)")).toBeInTheDocument();
    expect(screen.getByText("위험한 링크가 포함되어 있습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🚨 가족에게 위험 알리기" })).toBeInTheDocument();
  });

  it("shows safe UI on safe score", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        risk_score: 10,
        risk_level: "안전",
        reasons: "안전한 문자입니다.",
      }),
    });

    render(<Home />);
    
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "안전한 텍스트 1588-9999" } });
    
    const button = screen.getByRole("button", { name: "안전 검사 시작하기" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("10점")).toBeInTheDocument();
    });

    expect(screen.getByText("안전 (안심)")).toBeInTheDocument();
    expect(screen.getByText("📞 공식 고객센터 확인 완료")).toBeInTheDocument();
    expect(screen.getByText("안전한 문자입니다.")).toBeInTheDocument();
  });
});
