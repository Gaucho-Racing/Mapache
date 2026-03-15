.PHONY: install run test lint clean

install:
	uv sync

run:
	chmod +x scripts/run.sh
	./scripts/run.sh

test:
	chmod +x scripts/test.sh
	./scripts/test.sh

lint:
	uv run black .
	uv run isort .
	uv run flake8 .

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf dist
	rm -rf *.egg-info
