# check if pyproject.toml exists in current directory
if [ ! -f pyproject.toml ]; then
    echo "pyproject.toml not found"
    echo "Please make sure you are in the root service directory"
    exit 1
fi

# check if .env exists in current directory
if [ ! -f .env ]; then
    echo ".env not found"
    echo "Please make sure the .env file is present in the current directory"
    exit 1
fi


set -a
. .env
poetry install
poetry run pytest