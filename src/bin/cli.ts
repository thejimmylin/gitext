#!/usr/bin/env npx tsx

import { minimist } from "zx";
import { activateProfile, createProfile, deleteProfile, readProfiles, updateProfile } from "../lib";

export async function cli() {
  const argv = minimist(process.argv.slice(2), { string: ["email", "name", "_"] });

  const subcommand = argv._[0];
  if (subcommand === undefined || subcommand === "help" || argv.h || argv.help) {
    console.info("Available commands: `use`");
    return;
  }

  // `use` command
  const email = argv.email || argv._[1] || "";
  const name = argv.name || argv._[2] || "";

  let action: "status" | "activate" | "create" | "update" | "delete";
  if (argv.delete || argv.d) {
    action = "delete";
    if (!email) return console.error("Email is required");
  } else if (argv.update || argv.u) {
    action = "update";
    if (!email) return console.error("Email is required");
    if (!name) return console.error("Name is required");
  } else if (email && name) {
    action = "create";
  } else if (email) {
    action = "activate";
  } else {
    action = "status";
  }

  if (action === "status") {
    const profiles = await readProfiles();
    const lines = Object.entries(profiles).map(([email, { name, activated }]: any) => {
      if (activated) {
        return `* ${name} <${email}>`;
      } else {
        return `  ${name} <${email}>`;
      }
    });
    if (lines.length === 0) {
      console.info("No profiles created yet");
      return;
    } else {
      console.info(lines.join("\n"));
    }
  } else if (action === "create") {
    const profile = (await readProfiles())[email];
    if (profile) {
      console.error(`Profile ${profile.name} <${email}> already exists`);
      return;
    }
    await createProfile(email, name);
    console.info(`Created ${name} <${email}>`);
  } else if (action === "update") {
    const profile = (await readProfiles())[email];
    if (!profile) {
      console.error(`Profile ${email} not found`);
      return;
    }
    await updateProfile(email, name);
    console.info(`Updated ${profile.name} <${email}> as ${name} <${email}>`);
  } else if (action === "delete") {
    const profile = (await readProfiles())[email];
    if (!profile) {
      console.error(`Profile ${email} not found`);
      return;
    }
    await deleteProfile(email);
    console.info(`Deleted ${profile.name} <${email}>`);
  } else if (action === "activate") {
    const profiles = await readProfiles();
    let actualEmail: string;
    if (Object.keys(profiles).includes(email)) {
      actualEmail = email;
    } else {
      const guessEmail = Object.keys(profiles).find((key) => key.includes(email));
      actualEmail = guessEmail || email;
    }
    if (!profiles[actualEmail]) {
      console.error(`Profile ${actualEmail} not found`);
      return;
    }
    await activateProfile(actualEmail);
    const newProfiles = await readProfiles();
    const lines = Object.entries(newProfiles).map(([email, { name, activated }]: any) => {
      if (activated) {
        return `* ${name} <${email}>`;
      } else {
        return `  ${name} <${email}>`;
      }
    });
    console.info(lines.join("\n"));
  }
}

cli();
