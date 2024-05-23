# Silverstone

Silverstone is a template service for Mapache. It's provided as a convenience to quickly get started implementing a new service to the backend.

## Getting Started

There's a helper script to copy over all the files into a new directory in `scripts/init-service.sh`.

```shell
chmod +x scripts/init-service.sh
./scripts/init-service.sh
```

You will be prompted for the name of your service. This name will just be used for the directory it created, so please use an all lowercase spelling. Please try to keep the directory all one word, but if needed underscores can be used.

## Service Configuration

Congrats, you now have a brand new service to start hacking on. But before you go all crazy, there's a couple thing you need to modify first.

### `go.mod`

In the `go.mod` file you should see something like the following.

```go
module silverstone

go 1.22

require (
	github.com/bk1031/rincon-go v1.1.2
...
```

Go ahead and refactor the `module silverstone` with the name of the new directory you just created. It's helpful to use your IDE here so that all the existing imports throughout the service will also be updated.

### `config/config.go`

Here, you will need to first edit the `Name` field of the `Service` struct. Please make sure to use lowercase snake_case for your service name.

```go
var Service rincon.Service = rincon.Service{
	Name:    "silverstone",
	Version: "1.0.0",
}

var Routes = []string{
	fmt.Sprintf("/%s/ping", strings.ToLower(Service.Name)),
}

...
```

The next thing to change there is the routes that you service will register. The existing route is `/montecito/ping` (the `montecito` is automatically replaced with the service name that you specified). Add whatever routes your service needs here.

Check out the [Rincon docs](https://github.com/bk1031/rincon) for more information about service or route registration.

### `.env`

Lastly, you need to create the required environemnt variables. Go ahead an create a `.env` file and copy in the following.

```env
ENV=DEV
PORT=7001

DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="mapache"
DB_USER="admin"
DB_PASSWORD="password"

RINCON_USER="admin"
RINCON_PASSWORD="admin"
```

Make the neccesary changes (important ones are `PORT`, `DB_PASSWORD`, `RINCON_USER`, and `RINCON_PASSWORD`) and save this.