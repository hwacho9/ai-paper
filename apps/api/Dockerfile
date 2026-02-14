# APIサービス用Dockerfile
# ローカル開発 + Cloud Run デプロイ兼用
FROM python:3.11-slim

WORKDIR /app

# curl + LaTeXコンパイラ（pdflatex）をインストール
RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  biber \
  lmodern \
  texlive-bibtex-extra \
  texlive-latex-base \
  texlive-latex-recommended \
  texlive-latex-extra \
  texlive-fonts-recommended \
  && rm -rf /var/lib/apt/lists/*

# 依存パッケージのインストール（キャッシュ活用）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY app/ ./app/

# Cloud Runが提供するPORT環境変数を使用（デフォルト: 8080）
ENV PORT=8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:${PORT}/healthz || exit 1

# 起動コマンド（--reload はdocker-compose側のcommandで上書き）
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
