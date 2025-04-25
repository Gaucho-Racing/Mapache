.PHONY: install run test lint clean

install:
	poetry install

run:
	chmod +x scripts/run.sh
	./scripts/run.sh

test:
	chmod +x scripts/test.sh
	./scripts/test.sh

lint:
	poetry run black .
	poetry run isort .
	poetry run flake8 .

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf dist
	rm -rf *.egg-info
