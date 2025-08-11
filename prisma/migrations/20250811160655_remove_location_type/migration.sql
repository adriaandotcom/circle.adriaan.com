-- Remove deprecated enum value 'location' from NodeType safely

-- 1) Clear data that uses the old value
UPDATE "Node" SET "type" = NULL WHERE "type" = 'location';

-- 2) Create a new enum without 'location'
CREATE TYPE "NodeType_new" AS ENUM ('company', 'person', 'group');

-- 3) Switch column to the new enum
ALTER TABLE "Node" ALTER COLUMN "type" TYPE "NodeType_new" USING ("type"::text::"NodeType_new");

-- 4) Drop old enum and rename the new one
DROP TYPE "NodeType";
ALTER TYPE "NodeType_new" RENAME TO "NodeType";


