import { $ as $$, fs, os, path } from "zx";

const HOME = os.homedir();
const PROFILES_PATH = path.join(HOME, ".gitext", "profiles.json");
const SSH_DIR = path.join(HOME, ".ssh");

const $ = $$({ timeout: "3s" });

if (!(await fs.exists(PROFILES_PATH))) {
  await fs.mkdir(path.dirname(PROFILES_PATH), { recursive: true });
  await fs.writeJson(PROFILES_PATH, {}, { spaces: 2 });
}

export async function generateSshKey(email: string) {
  const dir = path.join(HOME, ".ssh", email);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir, { recursive: true });
  }
  const file = path.join(HOME, ".ssh", email, "id_ed25519");
  return await $`ssh-keygen -t ed25519 -N "" "-C" my-email@gmail.com -f ${file}`;
}

export async function createProfile(email: string, name: string, profilesPath: string = PROFILES_PATH) {
  const profiles = await readProfiles();
  if (Object.keys(profiles).includes(email)) {
    throw new Error(`Profile ${email} already exists`);
  }

  const newProfiles = { ...profiles, [email]: { name, activated: false } };
  await fs.writeJson(profilesPath, newProfiles, { spaces: 2 });

  await generateSshKey(email);
}

export async function readProfiles(path: string = PROFILES_PATH) {
  if (!(await fs.exists(path))) {
    await fs.writeJSON(path, {}, { spaces: 2 });
  }

  return await fs.readJson(path);
}

export async function updateProfile(email: string, name: string, profilesPath: string = PROFILES_PATH) {
  const profiles = await readProfiles();
  if (!Object.keys(profiles).includes(email)) {
    throw new Error(`Profile ${email} not found`);
  }

  profiles[email].name = name;
  await fs.writeJson(profilesPath, profiles, { spaces: 2 });

  if (profiles[email].activated) {
    await $`git config --global user.name ${name}`;
  }
}

export async function deleteProfile(email: string, profilesPath: string = PROFILES_PATH, sshDir: string = SSH_DIR) {
  const profiles = await readProfiles();
  if (!Object.keys(profiles).includes(email)) {
    throw new Error(`Profile ${email} not found`);
  }

  if (profiles[email].activated) {
    throw new Error(`Profile ${email} is currently activated`);
  }

  delete profiles[email];
  await fs.writeJson(profilesPath, profiles, { spaces: 2 });

  await $`rm -rf ${path.join(sshDir, email)}`;
}

export async function activateProfile(email: string, profilesPath: string = PROFILES_PATH, sshDir: string = SSH_DIR) {
  const profiles = await readProfiles();
  if (!Object.keys(profiles).includes(email)) {
    throw new Error(`Profile ${email} not found`);
  }

  const newProfiles = Object.fromEntries(
    Object.entries(profiles).map(([key, profile]: [string, any]) => {
      const activated = key === email;
      return [key, { ...profile, activated }];
    })
  );

  await fs.writeJson(profilesPath, newProfiles, { spaces: 2 });

  await $`cp ${path.join(sshDir, email, "id_ed25519")} ${path.join(sshDir, "id_ed25519")}`;
  await $`cp ${path.join(sshDir, email, "id_ed25519.pub")} ${path.join(sshDir, "id_ed25519.pub")}`;
  await $`git config --global user.name ${profiles[email].name}`;
  await $`git config --global user.email ${email}`;
}
