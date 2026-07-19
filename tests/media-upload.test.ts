import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ADMIN_IMAGE_MIME_TYPES,
  MAX_ADMIN_IMAGE_BYTES,
  isAllowedMediaReference,
  isCloudinaryMediaReference,
  isLocalMediaReference,
} from "../lib/media-reference";

test("media references allow local assets and only the configured Cloudinary cloud", () => {
  const previous = process.env.CLOUDINARY_CLOUD_NAME;
  process.env.CLOUDINARY_CLOUD_NAME = "clinic-cloud";
  try {
    assert.equal(isLocalMediaReference("/media/home/facial.jpg"), true);
    assert.equal(isLocalMediaReference("/media/../secret.jpg"), false);
    assert.equal(
      isCloudinaryMediaReference(
        "https://res.cloudinary.com/clinic-cloud/image/upload/v1/monebeauty/admin/facial.jpg",
      ),
      true,
    );
    assert.equal(
      isAllowedMediaReference(
        "https://res.cloudinary.com/other-cloud/image/upload/v1/image.jpg",
      ),
      false,
    );
    assert.equal(
      isAllowedMediaReference("https://example.com/image.jpg"),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
    else process.env.CLOUDINARY_CLOUD_NAME = previous;
  }
});

test("admin uploads use the approved image formats and 25 MB limit", () => {
  assert.equal(MAX_ADMIN_IMAGE_BYTES, 25 * 1024 * 1024);
  assert.deepEqual(ADMIN_IMAGE_MIME_TYPES, [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "image/gif",
  ]);
  assert.equal(
    (ADMIN_IMAGE_MIME_TYPES as readonly string[]).includes("image/svg+xml"),
    false,
  );
});

test("upload endpoint is admin-only and keeps credentials server-side", () => {
  const route = readFileSync("app/api/admin/media/upload/route.ts", "utf8");
  const cloudinary = readFileSync("lib/cloudinary.ts", "utf8");
  assert.match(route, /requireApiUser\(\["ADMIN"\]\)/);
  assert.match(route, /MAX_ADMIN_IMAGE_BYTES/);
  assert.match(route, /ADMIN_IMAGE_MIME_TYPES/);
  assert.match(route, /uploadAdminImage\(file\)/);
  assert.match(cloudinary, /import "server-only"/);
  assert.match(cloudinary, /folder: "monebeauty\/admin"/);
  assert.match(cloudinary, /allowed_formats/);
  assert.doesNotMatch(cloudinary, /NEXT_PUBLIC_CLOUDINARY_API_SECRET/);
});

test("media fields upload and retain existing manual media controls", () => {
  const field = readFileSync("components/admin/MediaField.tsx", "utf8");
  const router = readFileSync("components/admin/AdminRouter.tsx", "utf8");
  const actions = readFileSync("lib/admin-actions.ts", "utf8");
  const nextConfig = readFileSync("next.config.ts", "utf8");
  assert.match(field, /fetch\("\/api\/admin\/media\/upload"/);
  assert.match(field, /useTranslations\("Admin\.media"\)/);
  assert.match(field, /type="file"/);
  assert.match(field, /multiple=\{multiple\}/);
  assert.match(field, /<ThemedSelect/);
  assert.match(router, /<NextIntlClientProvider/);
  assert.match(router, /messages=\{\{ Admin: \{ media: mediaMessages \} \}\}/);
  assert.match(router, /t\.raw\("media"\)/);
  assert.match(actions, /isAllowedMediaReference/);
  assert.match(actions, /CLINIC_UPLOAD/);
  assert.match(nextConfig, /hostname: "res\.cloudinary\.com"/);
});

test("committed environment templates contain placeholders, never credentials", () => {
  const example = readFileSync(".env.example", "utf8");
  assert.match(example, /CLOUDINARY_CLOUD_NAME=""/);
  assert.match(example, /CLOUDINARY_API_KEY=""/);
  assert.match(example, /CLOUDINARY_API_SECRET=""/);
  assert.match(example, /CLOUDINARY_URL=""/);
  const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
  assert.match(workflow, /CLOUDINARY_URL: \$\{\{ secrets\.CLOUDINARY_URL \}\}/);
  assert.match(workflow, /printf 'CLOUDINARY_URL=%s\\n' "\$CLOUDINARY_URL"/);
});
