# Makefile for American Roulette Project

# --- Variables ---
# Using the official docker compose command format
COMPOSE_FILE := docker-compose.yml

.PHONY: all setup build run test clean

# --- Target: all ---
all: build test

# --- Target: setup ---
# 1. Ensures the database container is running and migrated.
setup:
	@echo "--- ⚙️ Setting up initial database and running migrations ---"
	docker compose -f $(COMPOSE_FILE) up -d db
	@echo "Waiting for PostgreSQL service to become available..."
	docker compose -f $(COMPOSE_FILE) exec db pg_isready -U rouletteuser
	@echo "Running database migrations..."
	docker compose -f $(COMPOSE_FILE) exec backend python manage.py migrate

# --- Target: build ---
# Builds all services using the docker-compose file
build:
	@echo "--- 🧱 Building all services... ---"
	docker compose -f $(COMPOSE_FILE) up --build

# --- Target: run ---
# Starts all services and keeps them running
run: setup build
	@echo "--- ▶️ Running all services (Background) ---"
	docker compose -f $(COMPOSE_FILE) up -d

# --- Target: test ---
# Runs the full test suite against the services
test: setup
	@echo "--- 🧪 Running Backend Unit & Integration Tests ---"
	docker compose -f $(COMPOSE_FILE) exec backend python manage.py test roulette_api.tests.test_payouts
	@echo "----------------------------------------------------"
	docker compose -f $(COMPOSE_FILE) exec backend python manage.py test roulette_api.tests.test_integration_cycle

# --- Target: clean ---
clean:
	@echo "--- 🧹 Stopping and removing all services ---"
	docker compose -f $(COMPOSE_FILE) down -v
