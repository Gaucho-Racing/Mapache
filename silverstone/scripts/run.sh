# check if go.mod exists in current directory
if [ ! -f go.mod ]; then
    echo "go.mod not found"
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
go get .
go run main.go