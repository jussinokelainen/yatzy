.PHONY: build restart server web clean

build: server web

restart: build
	@printf "[\e[35m INFO \e[0m] Checking for existing server...\n"
	@docker compose down

	@sleep .2
	@printf "[\e[35m INFO \e[0m] Starting server...\n"
	@sleep .5
	@docker compose up --build

server:
	@printf "\e[31mCompiling server...\e[0m\n"

	@cd ./server/ && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server
	@printf "[\e[32m OK \e[0m] Compiling server done\n"

web: web/node_modules
	@printf "\e[31mCompiling website...\e[0m\n"

	@cd ./web/ && npm run build
	@printf "[\e[32m OK \e[0m] Compiling website done\n"

web/node_modules: ./web/package-lock.json
	@printf "\e[31mInstalling node modules...\e[0m\n"
	@cd ./web/ && npm ci

clean:
	@printf "\e[31mCleaning up...\e[0m"
	@rm -rf ./server/server
	@rm -rf ./web/node_modules/
	@rm -rf ./web/dist/
	@printf "\r\e[0K"
	@printf "[\e[32m OK \e[0m] Cleaning done\n"
