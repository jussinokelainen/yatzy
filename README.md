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
```

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
