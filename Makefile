.PHONY: dev dev-web dev-api test lint seed migrate

dev:
	docker-compose up

dev-web:
	cd apps/web && npm run dev

dev-api:
	cd apps/api && python -m uvicorn app.main:app --reload --port 8000

test:
	$(MAKE) test-api
	$(MAKE) test-web

test-api:
	cd apps/api && python -m pytest tests/ -v

test-web:
	cd apps/web && npm test

lint:
	cd apps/api && python -m ruff check . && python -m mypy app/
	cd apps/web && npm run lint

seed:
	cd apps/api && python -m app.seed

migrate:
	cd apps/api && alembic upgrade head
