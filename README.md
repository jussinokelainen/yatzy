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

## Accounts

Players log in with an account that they create from the website.
New accounts are not allowed to play right away, they have to be
enabled by hand in the database:

```
docker compose exec db psql -U <user> -d <name> \
	-c "UPDATE users SET allowed=true WHERE username='<username>';"
```

Login sessions are stored in the database as hashed tokens and are
valid for 30 days. Logging out removes the session from the database.

Since the database schema was redesigned for accounts, databases
created with an older version of the schema do not work anymore and
need to be recreated, which wipes all existing scores:

```
docker compose down -v
make restart
```
