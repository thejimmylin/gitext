import { $ as $$, fs, os, path } from "zx";

const HOME = os.homedir();
const PROFILES_PATH = path.join(HOME, ".gitext-dev", "profiles.json");
const SSH_DIR = path.join(HOME, ".ssh");

const $ = $$({ timeout: "3s" });

type Profile = {
  name: string;
  activated: boolean;
};

type ProfilesState = Record<string, Profile>;

type ProfileAction =
  | { type: "CREATE"; email: string; name: string }
  | { type: "UPDATE"; email: string; name: string }
  | { type: "DELETE"; email: string }
  | { type: "ACTIVATE"; email: string };

async function profileReducer(state: ProfilesState, action: ProfileAction): Promise<ProfilesState> {
  switch (action.type) {
    case "CREATE": {
      if (state[action.email]) {
        throw new Error(`Profile ${action.email} already exists`);
      }
      await generateSshKey(action.email);
      return { ...state, [action.email]: { name: action.name, activated: false } };
    }

    case "UPDATE": {
      if (!state[action.email]) {
        throw new Error(`Profile ${action.email} not found`);
      }
      const updatedProfile = { ...state[action.email], name: action.name };
      if (updatedProfile.activated) {
        await $`git config --global user.name ${action.name}`;
      }
      return { ...state, [action.email]: updatedProfile };
    }

    case "DELETE": {
      if (!state[action.email]) {
        throw new Error(`Profile ${action.email} not found`);
      }
      if (state[action.email].activated) {
        throw new Error(`Profile ${action.email} is currently activated`);
      }
      await $`rm -rf ${path.join(SSH_DIR, action.email)}`;
      const { [action.email]: _, ...newState } = state;
      return newState;
    }

    case "ACTIVATE": {
      if (!state[action.email]) {
        throw new Error(`Profile ${action.email} not found`);
      }
      const newState = Object.fromEntries(
        Object.entries(state).map(([email, profile]) => [email, { ...profile, activated: email === action.email }])
      );
      await $`cp ${path.join(SSH_DIR, action.email, "id_ed25519")} ${path.join(SSH_DIR, "id_ed25519")}`;
      await $`cp ${path.join(SSH_DIR, action.email, "id_ed25519.pub")} ${path.join(SSH_DIR, "id_ed25519.pub")}`;
      await $`git config --global user.name ${state[action.email].name}`;
      await $`git config --global user.email ${action.email}`;
      return newState;
    }

    default: {
      return state;
    }
  }
}

export async function generateSshKey(email: string) {
  const dir = path.join(HOME, ".ssh", email);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir, { recursive: true });
  }
  const file = path.join(HOME, ".ssh", email, "id_ed25519");
  return await $`ssh-keygen -t ed25519 -N "" "-C" my-email@gmail.com -f ${file}`;
}

export async function readProfiles(profilesPath: string = PROFILES_PATH) {
  if (!(await fs.exists(PROFILES_PATH))) {
    await fs.mkdir(path.dirname(PROFILES_PATH), { recursive: true });
    await fs.writeJson(PROFILES_PATH, {}, { spaces: 2 });
  }
  return await fs.readJson(profilesPath);
}

export async function createProfile(email: string, name: string, profilesPath: string = PROFILES_PATH) {
  const profiles = await readProfiles(profilesPath);
  const newProfiles = await profileReducer(profiles, { type: "CREATE", email, name });
  await fs.writeJson(profilesPath, newProfiles, { spaces: 2 });
}

export async function updateProfile(email: string, name: string, profilesPath: string = PROFILES_PATH) {
  const profiles = await readProfiles(profilesPath);
  const newProfiles = await profileReducer(profiles, { type: "UPDATE", email, name });
  await fs.writeJson(profilesPath, newProfiles, { spaces: 2 });
}

export async function deleteProfile(email: string, profilesPath: string = PROFILES_PATH) {
  const profiles = await readProfiles(profilesPath);
  const newProfiles = await profileReducer(profiles, { type: "DELETE", email });
  await fs.writeJson(profilesPath, newProfiles, { spaces: 2 });
}

export async function activateProfile(email: string, profilesPath: string = PROFILES_PATH) {
  const profiles = await readProfiles(profilesPath);
  const newProfiles = await profileReducer(profiles, { type: "ACTIVATE", email });
  await fs.writeJson(profilesPath, newProfiles, { spaces: 2 });
}
