DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status') THEN
    CREATE TYPE "public"."status" AS ENUM('ACTIVE', 'INACTIVE');
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" varchar(100) NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "public"."status" DEFAULT 'ACTIVE' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";
--> statement-breakpoint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_org_email_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_org_email_unique" UNIQUE("organization_id", "email");
  END IF;
END $$;
