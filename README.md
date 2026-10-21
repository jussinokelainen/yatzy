# Simple Yatzy webapp
Dependencies:
```
docker
docker compose
```

## Quick start
To get yatzy up and running, make sure docker is running, and 
there is a .env file that contains the following

```
DATABASE_NAME="<name>"
DATABASE_USER="<user>"
DATABASE_PASSWORD="<password>"

# Optional
COOKIE_SECURE=boolean
```

Optional COOKIE_SECURE variable can be set to true or false
to override the automatic detection whether cookies should only
be sent over https or not.

All that is needed after that is to run

```
make restart
```

Alternatively 

```
make
docker compose up --build
```

can be used.
