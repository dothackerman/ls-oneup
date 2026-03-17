import { applyD1Migrations, env } from "cloudflare:test";
import { beforeEach } from "vitest";

async function clearProbeImages(): Promise<void> {
  let cursor: string | undefined;

  do {
    const listed = await env.PROBE_IMAGES.list({ cursor });
    if (listed.objects.length > 0) {
      await Promise.all(listed.objects.map((object) => env.PROBE_IMAGES.delete(object.key)));
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  await env.DB.exec("DELETE FROM probes;");
  await clearProbeImages();
});
