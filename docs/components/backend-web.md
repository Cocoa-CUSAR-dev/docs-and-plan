---
sidebar_position: 2
---

# Web Backend (Kotlin)

**Location:** `cocoa_project_transfer/backend-web-transfer-2026-06-16/` · **Stack:** Kotlin, Spring Boot, jOOQ, JWT · **Serves:** the researcher web app

## Project structure

```
src/
├── main/
│   ├── kotlin/com/cocoa/web/
│   │   ├── base/              # Base classes and interfaces
│   │   ├── config/            # Spring configuration
│   │   ├── controller/        # API controllers
│   │   ├── exception/         # Exception handling
│   │   ├── jooq/              # Custom jOOQ bindings and converters
│   │   ├── model/             # Plain Kotlin data classes
│   │   ├── repository/        # Database access via jOOQ
│   │   ├── security/          # JWT authentication and filters
│   │   ├── service/           # Business logic
│   │   └── util/              # Utilities
│   └── resources/
└── generated/                 # jOOQ generated classes (do not edit)
```

## Architecture rules (keep these)

- **jOOQ over JPA** — SQL is explicit; no ORM magic.
- **Repositories do not inject other repositories.** Cross-domain assembly happens in the service layer.
- **Model classes never reference jOOQ records.** jOOQ types stay inside repositories; models are plain Kotlin data classes.

## Environment

Create `./src/.env`:

```env
SPRING_APPLICATION_NAME=web

SPRING_DATASOURCE_URL=                        # NeonDB connection string
SPRING_DATASOURCE_USERNAME=                   # NeonDB username
SPRING_DATASOURCE_PASSWORD=                   # NeonDB password
SPRING_DATASOURCE_HIKARI_MAX_POOL_SIZE=32
SPRING_DATASOURCE_HIKARI_MIN_IDLE=10
SPRING_DATASOURCE_HIKARI_IDLE_TIMEOUT=300000

CORS_ORIGIN=                                  # Allowed origin, e.g. http://localhost:3000

SERVER_CONTEXT_PATH=/api/v1
SERVER_PORT=3001

JWT_KEY=                                      # Secret key for signing JWT
JWT_NAME=                                     # Cookie name for JWT
JWT_ACCESS_TOKEN_EXPIRATION=36000000          # In milliseconds
JWT_REFRESH_TOKEN_EXPIRATION=86400000         # In milliseconds

SWAGGER_UI_PATH=/swagger-ui.html
API_DOCS_PATH=/api-docs
```

## Develop

Prerequisite: **JDK 21**.

```bash
./gradlew generateJooq   # re-run after every DB schema change
./gradlew bootRun        # http://localhost:3001
```

IntelliJ run configurations exist in `.run/` ("Run Server", "Re-Generate JOOQ").

## Deploy

```bash
./gradlew clean build
# output: ./src/build/libs/cocoa.jar
java -jar cocoa.jar      # needs JDK 21 + the .env file next to it
```

## API reference

With the server running (paths are under the `/api/v1` context path):

| Path | Description |
|---|---|
| `/api/v1/swagger-ui.html` | Swagger UI |
| `/api/v1/api-docs` | Raw OpenAPI JSON |

## Gotchas

- `generateJooq` reads the live database — schema drift between environments changes your generated code. This is one reason the [migration-tool issue (O1)](/docs/critical-issues#o1) matters.
- `farm_activity.farm_activity_id` is the single `varchar` PK in the whole DB, so jOOQ types it `String` while everything else is `UUID` ([T1](/docs/database/fix-decisions#t1)).
