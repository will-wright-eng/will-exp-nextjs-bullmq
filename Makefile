#* Setup
.PHONY: $(shell sed -n -e '/^$$/ { n ; /^[^ .\#][^ ]*:/ { s/:.*$$// ; p ; } ; }' $(MAKEFILE_LIST))
.DEFAULT_GOAL := help

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Available targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'

# Install dependencies
install: install-shared install-nextjs install-worker ## Install dependencies for all services

install-shared: ## Install shared package dependencies
	@echo "Installing shared package dependencies..."
	cd nextjs-app/shared && npm install

install-nextjs: ## Install Next.js app dependencies
	@echo "Installing Next.js app dependencies..."
	cd nextjs-app && npm install

install-worker: ## Install worker dependencies
	@echo "Installing worker dependencies..."
	cd worker && npm install

# Build commands
build: ## Build Docker images
	@echo "Building Docker images..."
	docker compose build

build-shared: ## Build shared package
	@echo "Building shared package..."
	cd nextjs-app/shared && npm run build

build-nextjs: ## Build Next.js app
	@echo "Building Next.js app..."
	cd nextjs-app && npm run build

build-worker: ## Build worker service
	@echo "Building worker service..."
	cd worker && npm run build

# Docker Compose commands
up: ## Start all services
	@echo "Starting all services..."
	docker compose up --build --remove-orphans

down: ## Stop all services
	@echo "Stopping all services..."
	docker compose down

restart: down up ## Restart all services
	@echo "Restarting all services..."

# Logs
logs: ## View logs from all services
	docker compose logs

logs-follow: ## Follow logs from all services
	docker compose logs -f

nextjs-logs: ## View Next.js app logs
	docker compose logs -f nextjs-app

worker-logs: ## View worker logs
	docker compose logs -f worker

redis-logs: ## View Redis logs
	docker compose logs -f redis

postgres-logs: ## View PostgreSQL logs
	docker compose logs -f postgres

# Database and Redis CLI
redis-cli: ## Open Redis CLI
	docker compose exec redis redis-cli

psql: ## Open PostgreSQL CLI
	docker compose exec postgres psql -U postgres -d bullmq_jobs

# Development mode (with volume mounts for hot reload)
dev: ## Start services in development mode
	@echo "Starting services in development mode..."
	docker compose up

# Clean up
clean: ## Clean up containers, volumes, and images
	@echo "Cleaning up containers, volumes, and images..."
	docker compose down -v --rmi local

clean-all: clean ## Remove all Docker images for this project
	@echo "Removing all Docker images for this project..."
	docker compose down -v --rmi all

# Test commands (placeholder)
test: ## Run tests
	@echo "Running tests..."
	@echo "TODO: Add test commands"

# Status check
status: ## Check service status
	@echo "Service status:"
	docker compose ps

# Scale workers
scale-worker: ## Scale workers to 2 instances
	@echo "Scaling workers to 2 instances..."
	docker compose up -d --scale worker=2

# Rebuild and restart
rebuild: down build up ## Rebuild and restart all services
	@echo "Rebuilt and restarted all services"

# Quick start (install, build, up)
quick-start: install build up ## Install dependencies, build, and start all services
	@echo "Quick start complete! Services are running."
