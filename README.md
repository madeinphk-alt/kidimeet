# KidiMeet

מערכת מפגשים לילדים — פשוטה, חכמה, הוגנת.

## הרצה מהירה

```bash
# 1. התקנת dependencies
npm install

# 2. הרצה מקומית (עם mock data, ללא Supabase)
npm run dev

# 3. פתח http://localhost:3000
```

## חיבור Supabase (אחרי MVP)

1. צור חשבון ב-[supabase.com](https://supabase.com) (חינם)
2. צור פרויקט חדש
3. לך ל-SQL Editor → הרץ `supabase/schema.sql`
4. העתק `cp .env.local.example .env.local`
5. הכנס את ה-URL וה-Key מ-Supabase Settings > API
6. החלף את הקריאות ב-`mock-data.ts` בקריאות ל-`supabase.ts`

## מבנה הפרויקט

```
src/
├── app/
│   ├── page.tsx              # בית — מי פנוי מחר
│   ├── child/[id]/page.tsx   # כרטיס ילד + היסטוריה
│   ├── invite/[id]/page.tsx  # שליחת הזמנה
│   └── settings/page.tsx    # הגדרות זמינות שבועית
├── components/
│   ├── ChildCard.tsx         # כרטיס ילד ברשימה
│   ├── Avatar.tsx            # תמונת פרופיל עם ראשי תיבות
│   └── Badge.tsx             # תגית צבעונית
└── lib/
    ├── types.ts              # כל ה-TypeScript types
    ├── mock-data.ts          # נתוני דמה לפיתוח
    ├── utils.ts              # אלגוריתם רוטציה, זמינות, תאריכים
    └── supabase.ts           # קריאות ל-Supabase (production)
```

## הלוגיקה המרכזית

**רוטציה:** המערכת בודקת את המפגש האחרון בין כל זוג ילדים ומציעה להפוך — אם פעם אחרונה היה אצלנו, הפעם נלך אליהם.

**מיון:** ילדים שלא נפגשנו איתם הכי הרבה זמן מופיעים ראשונים.

**הורים גרושים:** לכל ילד יכולים להיות שני הורים עם `custody_days` שונים — המערכת שולחת אוטומטית להורה הנכון לפי היום.
