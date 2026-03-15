FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY query ./query
RUN uv sync --frozen --no-dev

ENTRYPOINT ["uv", "run", "python", "-m", "query.main"]
