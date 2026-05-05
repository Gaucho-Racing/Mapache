.PHONY: install run lint clean

install:
	uv sync

run:
	chmod +x scripts/run.sh
	./scripts/run.sh

lint:
	uv run black .
	uv run isort .
	uv run flake8 .

clean:
	rm -rf __pycache__
	rm -rf dist
	rm -rf *.egg-info
