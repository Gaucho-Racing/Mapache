# check if pyproject.toml exists in current directory
if [ ! -f pyproject.toml ]; then
    echo "pyproject.toml not found"
    echo "Please make sure you are in the root service directory"
    exit 1
fi

# check if test.env exists in scripts directory
if [ ! -f scripts/test.env ]; then
    echo "test.env not found"
    echo "Please make sure the test.env file is present in the scripts directory"
    exit 1
fi


set -a
. scripts/test.env
poetry install
poetry run pytest