"""Control Git config, SSH keys, and commit signing keys for multiple Git profiles.

Command Examples:
    python main.py create b00502013@gmail.com "Jimmy Lin"
    python main.py create jimmy@refl.ai
    python main.py update jimmy@refl.ai --name="Jimmy"
    python main.py activate b00502013@gmail
    python main.py activate jimmy@refl.ai
    python main.py delete b00502013@gmail.com
"""

import datetime
import json
import pathlib
import subprocess
import shutil
import typer

SSH_DIR = pathlib.Path.home() / ".ssh"


def read_profiles(path=SSH_DIR / "gittool-profiles.json"):
    if not path.exists():
        path.write_text(json.dumps({}, indent=2))

    return json.loads(path.read_text())


def create_profile(email, name, path=SSH_DIR / "gittool-profiles.json"):
    profiles = read_profiles(path)
    if email in profiles:
        raise ValueError(f"Profile for {email} already exists")

    utc_now = datetime.datetime.now(datetime.timezone.utc)
    profiles[email] = {
        "name": name,
        "activated": False,
        "created_at": str(utc_now),
    }

    path.write_text(json.dumps(profiles, indent=2))

    generate_ssh_key(email)


def update_profile(email, name, path=SSH_DIR / "gittool-profiles.json"):
    profiles = read_profiles(path)
    if email not in profiles:
        raise ValueError(f"Profile for {email} does not exist")

    profiles[email]["name"] = name

    path.write_text(json.dumps(profiles, indent=2))

    if profiles[email]["activated"]:
        subprocess.run(["git", "config", "--global", "user.name", name])


def delete_profile(email, path=SSH_DIR / "gittool-profiles.json"):
    profiles = read_profiles(path)
    if email not in profiles:
        raise ValueError(f"Profile for {email} does not exist")

    if profiles[email]["activated"]:
        raise ValueError(f"Profile for {email} is currently activated")

    del profiles[email]

    path.write_text(json.dumps(profiles, indent=2))

    shutil.rmtree(SSH_DIR / email, ignore_errors=True)


def activate_profile(email, path=SSH_DIR / "gittool-profiles.json"):
    profiles = read_profiles(path)
    if email not in profiles:
        raise ValueError(f"Profile for {email} does not exist")

    for profile in profiles.values():
        profile["activated"] = False
    profiles[email]["activated"] = True

    path.write_text(json.dumps(profiles, indent=2))

    subprocess.run(
        ["cp", str(SSH_DIR / email / "id_ed25519"), str(SSH_DIR / "id_ed25519")]
    )
    subprocess.run(
        ["cp", str(SSH_DIR / email / "id_ed25519.pub"), str(SSH_DIR / "id_ed25519.pub")]
    )
    subprocess.run(["git", "config", "--global", "user.name", profiles[email]["name"]])
    subprocess.run(["git", "config", "--global", "user.email", email])

    print(f"Activated profile for {email}")


def generate_ssh_key(email):
    path = SSH_DIR / email / "id_ed25519"
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ssh-keygen", "-t", "ed25519", "-N", "", "-C", email, "-f", str(path), "-q"]
    )


def cli(action: str, email: str, name: str = ""):

    if name == "":
        name = email

    if action == "create":
        return create_profile(email, name)

    if action == "update":
        return update_profile(email, name)

    if action == "delete":
        return delete_profile(email)

    if action == "activate":
        return activate_profile(email)

    if action == "use":
        # Work like activate but with fuzzy email matching
        all_emails = read_profiles().keys()
        for e in all_emails:
            if e.startswith(email):
                return activate_profile(e)

        raise ValueError(f"Profile with email like {email} does not exist")

    raise ValueError(f"Invalid action: {action}")
