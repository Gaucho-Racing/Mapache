FROM python:3.12-slim-bookworm

RUN pip install uv

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY query ./query
RUN uv sync --frozen --no-dev

ENTRYPOINT ["uv", "run", "python", "-m", "query.main"]
