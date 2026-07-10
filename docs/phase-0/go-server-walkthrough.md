---
sidebar_position: 3
title: Go Server Walkthrough
---

# Go Server Walkthrough (Mobile Backend)

:::info[Team analysis document]
Contributed by the team, 2026-07-10. A file-by-file walkthrough of the Go mobile backend with sequence diagrams. Original: 📄 **[Download the walkthrough (PDF)](/files/audits/go-server-walkthrough.pdf)**. Descriptions below keep the original Thai.
:::

Key facts this walkthrough established (they update what the transfer README implied):

- The server is **Gin** (router) + **GORM** (PostgreSQL access) — note this contradicts the "no ORM" philosophy of the Kotlin side; both hit the same database. Tracked as [GO-1 in the Weak-Point Register](/docs/phase-0#4-go-mobile-backend).
- Auth is a **JWT stored in a cookie** (`JWT_NAME`, signed with `JWT_KEY`); the middleware extracts only `user_id` into the request context.
- Routes split into **public** (`/public/login`, `/public/register`, `/public/test`) and **protected** (everything else). Server listens on **port 8080**.

## Sequence diagrams

### 1. Login and token issuance

Login checks bcrypt, loads roles, generates a JWT, and sets it as a cookie:

![Go login sequence](/diagrams/go_sequence_1.png)

### 2. Calling a protected API

JWT middleware validates the cookie, extracts `user_id`, and forwards to the route's handler:

![Go protected API sequence](/diagrams/go_sequence_2.png)

### 3. Dynamic form submission

`POST /tasks` reads the payload, finds the form's handler via `form.task_form`, and inserts into `form.response` plus the relevant domain tables inside a transaction:

![Go form submission sequence](/diagrams/go_sequence_3.png)

### Overview

![Go overview sequence](/diagrams/go_sequence_4.png)

![Go component and schema map](/diagrams/go_sequence_5.png)

![Go routing decision flow](/diagrams/go_sequence_6.png)

## File-by-file responsibilities

| File | หน้าที่ (responsibility) |
|---|---|
| `cmd/main.go` | จุดเริ่มต้น server: โหลด `.env`, เชื่อมต่อ DB ผ่าน `database.InitDB()`, สร้าง handlers, สร้าง Gin router, แบ่ง routes เป็น public/protected, เปิด server ที่ port 8080 |
| `internal/database/postgres.go` | เชื่อมต่อ PostgreSQL ด้วย **GORM**: ประกอบ connection string จาก `.env`, ตั้งค่า connection pool, คืน `*gorm.DB` |
| `internal/middleware/auth_middleware.go` | `JwtAuthMiddleware()`: อ่าน JWT จาก cookie, ตรวจด้วย `JWT_KEY`, ดึง `user_id` เก็บเข้า `gin.Context`; token ไม่ถูกต้อง → 401 |
| `internal/handlers/auth_handler.go` | `Login()` (ตรวจ username/password, ดึง roles, สร้าง JWT, set cookie), `Register()` (hash password, insert `auth.user_account`), `GetMe()`, `GenerateToken()` |
| `internal/handlers/agriculture_handler.go` | ลงทะเบียน farmer profile / farm / plot (พร้อม GIS polygon), `GetMyFarms()`, `GetMyPlots()` |
| `internal/handlers/collection_handler.go` | ลงทะเบียน hub collector / hub, `GetMyHub()` (พร้อม harvests), `GetMyHarvests()` |
| `internal/handlers/processing_handler.go` | ลงทะเบียน processor / processing station, `GetMyProcessingStation()` (พร้อม batches), `GetMyBatches()` |
| `internal/handlers/form_handler.go` | `GetTasks()` (พร้อมสถานะ COMPLETED / OVERDUE / NOT_STARTED), `SubmitTask()` (insert `form.response`), `GetTaskResponse()`, `UpdateTaskResponse()` |
| `internal/handlers/ref_handler.go` | `GetConstants(:key)` — dropdown/reference data ทุกชนิด |
| `internal/models/*.go` | GORM structs: `auth`, `farmer`, `farm` (→ plots), `plot`, `hub` (→ harvests), `harvest`, `processing_station` (→ batches), `batch`, `ref` |

## API summary

| Group | Endpoint | ทำอะไร |
|---|---|---|
| Auth | `POST /public/register` | สมัครสมาชิก |
| Auth | `POST /public/login` | เข้าสู่ระบบ, set JWT cookie |
| Auth | `GET /auth/me` | ดูข้อมูลตัวเอง + role |
| Reference | `GET /constants/:key` | ดึง dropdown/constants |
| Agriculture | `POST /farmers` · `POST /farms` · `POST /plots` | ลงทะเบียนเกษตรกร / ฟาร์ม / แปลงปลูก |
| Agriculture | `GET /farms` · `GET /plots` | ดูฟาร์ม/แปลงของตัวเอง |
| Collection | `POST /hub_collectors` · `POST /hubs` | ลงทะเบียนผู้รวบรวม / สร้าง hub |
| Collection | `GET /hubs` · `GET /harvests` | ดู hub และ harvest ของตัวเอง |
| Processing | `POST /processors` · `POST /processing_stations` | ลงทะเบียนผู้แปรรูป / สร้างสถานีแปรรูป |
| Processing | `GET /processing_stations` · `GET /batches` | ดูสถานีแปรรูป / batch ของตัวเอง |
| Tasks/Forms | `GET /tasks` (`?date=YYYY-MM-DD`) | ดูรายการ task |
| Tasks/Forms | `POST /tasks` | ส่งคำตอบ task (`task_id` + `answer`) |
| Tasks/Forms | `GET /tasks/:taskId` | ดูคำตอบที่เคยส่ง |
| Tasks/Forms | `PUT /tasks` | แก้ไขคำตอบเดิม |

### Supported `/constants/:key` values

`air_exposure_type`, `breed`, `chem_bio`, `cocoa_brean_grade`, `drying_facility`, `farm_activity_type`, `fertilizer_stage`, `fertilizer`, `grade`, `hole_filler`, `land_type`, `location_type`, `pest_disease`, `processing_activity_type`, `processing_defect`, `soil_type`, `tank_material`, `water_source`, `watering_system`, `weather_condition`, `province`, `district` (`?province_id=`), `subdistrict` (`?district_id=`), `farm`, `plot` (`?farm_id=`), `hub`, `processing_station`, `batch`, `harvest`, `location` (`?zip_code=`)

*(Note: `cocoa_brean_grade` is spelled that way in the code.)*

## Weak points fed into the register

The walkthrough surfaced [GO-1 through GO-6 in the Weak-Point Register](/docs/phase-0#4-go-mobile-backend) — most importantly the GORM/jOOQ split-brain (GO-1) and the roles-absent JWT (GO-2).
