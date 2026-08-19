COMPOSE := docker compose --env-file .env.local

.PHONY: local-init local-config local-build local-up local-down local-logs local-ps local-reset

local-init:
	@test -f .env.local || cp .env.local.example .env.local
	@echo "Local configuration: .env.local"

local-config: local-init
	$(COMPOSE) config --quiet

local-build: local-init
	$(COMPOSE) build api admin storefront

local-up: local-init
	$(COMPOSE) up -d --build

local-down: local-init
	$(COMPOSE) down

local-logs: local-init
	$(COMPOSE) logs -f api admin storefront

local-ps: local-init
	$(COMPOSE) ps

# Explicit destructive helper: removes local containers and database/Redis volumes.
local-reset: local-init
	$(COMPOSE) down --volumes --remove-orphans
