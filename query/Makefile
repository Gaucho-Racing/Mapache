.PHONY: install run test lint clean

install:
	poetry install

run:
	poetry install
	poetry run query

test:
	poetry run pytest

lint:
	poetry run black .
	poetry run isort .
	poetry run flake8 .

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf dist
	rm -rf *.egg-info
