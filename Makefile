.PHONY: build restart server web clean

build: server web

restart: build
	@printf "[\e[35m INFO \e[0m] Checking for existing server...\n"
	@echo
	@docker compose down

	@echo
	@printf "[\e[35m INFO \e[0m] Starting server...\n"
	@echo
	@docker compose up --build --detach

server:
	@printf "\e[31mCompiling server...\e[0m\n"
	@echo

	@mkdir -p ./bin
	@mkdir -p ./logs
	@cd ./server/ && cargo build --release
	@cp ./server/target/release/server ./bin/server
	@printf "[\e[32m OK \e[0m] Compiling server done\n"
	@echo

web: web/node_modules
	@printf "\e[31mCompiling website...\e[0m\n"
	@echo

	@cd ./web/ && npm run build
	@printf "[\e[32m OK \e[0m] Compiling website done\n"
	@echo

web/node_modules: ./web/package-lock.json
	@printf "\e[31mInstalling node modules...\e[0m\n"
	@echo
	@cd ./web/ && npm ci

clean:
	@printf "\e[31mCleaning up...\e[0m\n"
	@rm -rf ./bin/
	@rm -rf ./logs/
	@rm -rf ./web/node_modules/
	@rm -rf ./web/dist/
	@cd ./server/ && cargo clean
	@printf "\r\e[0K"
	@echo
	@printf "[\e[32m OK \e[0m] Cleaning done\n"
