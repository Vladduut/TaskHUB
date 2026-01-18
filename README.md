# TaskHUB

Aplicatie full-stack pentru gestionarea proiectelor si task-urilor, cu autentificare pe baza de cookie JWT.

## Pentru profesor
Platforma este functionala end-to-end. Puteti crea orice cont nou din interfata, apoi va puteti loga cu acel cont. Nu exista cont de test predefinit.

## Tehnologii
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Fastify + TypeScript
- ORM: Prisma
- Baza de date: PostgreSQL (Railway)
- Deploy: Vercel (frontend) + Railway (backend)

## Arhitectura
- Frontend consuma un API REST.
- Backend expune rute CRUD pentru proiecte si task-uri si rute de auth.
- Autentificare cu JWT in cookie (httpOnly).

## Functionalitati
- Login / logout
- Creare cont
- CRUD proiecte
- CRUD task-uri (bifat/debifat)
- Filtrare si sortare task-uri
- UI responsive

## Ce face platforma
- Permite utilizatorilor sa isi creeze un cont si sa se autentifice.
- Permite crearea, redenumirea si stergerea proiectelor.
- Permite adaugarea, bifarea/debifarea si stergerea task-urilor.
- Ofera filtre si sortare pentru task-uri (toate/active/bifate, A-Z, Z-A, noi/vechi).

## Rulare locala
1) Backend
```
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```
2) Frontend
```
cd frontend
npm install
npm run dev
```

## Variabile de mediu
Backend (Railway):
- DATABASE_URL
- JWT_SECRET
- CORS_ORIGIN (ex: https://task-hub-ashy.vercel.app,http://localhost:5173)

Frontend (Vercel):
- VITE_API_URL (ex: https://taskhub-production-5328.up.railway.app)

## Deploy
- Frontend: https://task-hub-ashy.vercel.app
- Backend: https://taskhub-production-5328.up.railway.app
- Health check: https://taskhub-production-5328.up.railway.app/health

## API (exemple)
- POST /auth/register
- POST /auth/login
- GET /auth/me
- POST /auth/logout
- GET /projects
- POST /projects
- PUT /projects/:id
- DELETE /projects/:id
- GET /tasks?projectId=...
- POST /tasks
- PUT /tasks/:id
- DELETE /tasks/:id

## Testare
- Nu sunt implementate teste automate in aceasta versiune.

## Demo
- Aplicatia este live pe linkul de frontend. Se poate crea orice cont nou direct din UI.
