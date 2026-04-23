#!/usr/bin/env node
import { run } from "../src/cli.mjs";

const result = await run(process.argv.slice(2));
process.stdout.write(`${JSON.stringify(result.payload)}\n`);
process.exit(result.exitCode);
