# Vilniaus tinklinio centras

Production-ready Next.js svetainė Vilniaus jaunimo tinklinio klubui (VTC).

## Tech stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (paruošta vėlesnei integracijai)
- **Vercel-ready**

## Reikalavimai

- Node.js 18.18 arba naujesnė versija
- npm, yarn arba pnpm

## Paleidimas lokaliai

1. **Klonuokite repozitoriją ir įeikite į projektą:**

```bash
cd vilniaus-tinklinio-centras
```

2. **Įdiekite priklausomybes:**

```bash
npm install
```

3. **Nukopijuokite aplinkos kintamųjų failą (nebūtina kol nenaudojate Supabase):**

```bash
cp .env.example .env.local
```

4. **Paleiskite kūrimo serverį:**

```bash
npm run dev
```

5. Atidarykite [http://localhost:3000](http://localhost:3000) naršyklėje.

## Puslapiai

| Maršrutas        | Aprašymas                    |
| ---------------- | ---------------------------- |
| `/`              | Pagrindinis puslapis         |
| `/apie`          | Apie klubą                   |
| `/grupes`        | Treniruočių grupės           |
| `/treneriai`     | Treneriai                    |
| `/registracija`  | Registracijos forma          |
| `/kontaktai`     | Kontaktai                    |

## Projekto struktūra

```
src/
├── app/                    # Next.js App Router puslapiai
│   ├── apie/
│   ├── grupes/
│   ├── treneriai/
│   ├── registracija/
│   ├── kontaktai/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── forms/              # Formos
│   ├── home/               # Pagrindinio puslapio sekcijos
│   ├── layout/             # Header, Footer
│   └── ui/                 # UI komponentai
└── lib/
    ├── supabase/           # Supabase klientai
    ├── validation/         # Formos validacija
    └── constants.ts        # Svetainės konstantos
```

## Supabase integracija (vėliau)

Projektas paruoštas Supabase integracijai:

1. Sukurkite projektą [supabase.com](https://supabase.com)
2. Nukopijuokite URL ir anon key į `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=jūsų_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=jūsų_anon_key
```

3. Naudokite klientus:
   - `src/lib/supabase/client.ts` – naršyklės pusė
   - `src/lib/supabase/server.ts` – serverio pusė

## Deploy į Vercel

1. Importuokite repozitoriją į [Vercel](https://vercel.com)
2. Pridėkite aplinkos kintamuosius (kai bus naudojamas Supabase)
3. Deploy vyksta automatiškai

Arba per CLI:

```bash
npm i -g vercel
vercel
```

## Komandos

| Komanda        | Aprašymas              |
| -------------- | ---------------------- |
| `npm run dev`  | Kūrimo serveris        |
| `npm run build`| Production build       |
| `npm run start`| Production serveris    |
| `npm run lint` | ESLint patikra         |

## Licencija

Privati – Vilniaus tinklinio centras.
