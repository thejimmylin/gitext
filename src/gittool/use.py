import argparse
import json
import pathlib
import shutil
import subprocess
from typing import Literal

SSH_DIR = pathlib.Path.home() / ".ssh"
PROFILES_PATH = pathlib.Path.home() / ".gittool-profiles.json"

__all__ = [
    "create_profile",
    "read_profiles",
    "update_profile",
    "delete_profile",
    "activate_profile",
    "generate_ssh_key",
    "cli",
]


def create_profile(email: str, name: str, path=PROFILES_PATH):
    profiles = read_profiles(path)
    if email in profiles:
        raise ValueError(f"Profile {email} already exists")

    profiles[email] = {
        "name": name,
        "activated": False,
    }

    path.write_text(json.dumps(profiles, indent=2))

    generate_ssh_key(email)


def read_profiles(path=PROFILES_PATH):
    if not path.exists():
        path.write_text(json.dumps({}, indent=2))

    return json.loads(path.read_text())


def update_profile(email: str, name: str, path=PROFILES_PATH):
    profiles = read_profiles(path)
    if email not in profiles:
        raise ValueError(f"Profile {email} not found")

    profiles[email]["name"] = name

    path.write_text(json.dumps(profiles, indent=2))

    if profiles[email]["activated"]:
        subprocess.run(["git", "config", "--global", "user.name", name])


def delete_profile(email: str, path=PROFILES_PATH, ssh_dir=SSH_DIR):
    profiles = read_profiles(path)
    if email not in profiles:
        raise ValueError(f"Profile {email} not found")

    if profiles[email]["activated"]:
        raise ValueError(f"Profile {email} is currently activated")

    del profiles[email]

    path.write_text(json.dumps(profiles, indent=2))

    shutil.rmtree(ssh_dir / email, ignore_errors=True)


def activate_profile(email: str, path=PROFILES_PATH, ssh_dir=SSH_DIR):
    profiles = read_profiles(path)
    if email not in profiles:
        raise ValueError(f"Profile for {email} not found")

    for profile in profiles.values():
        profile["activated"] = False
    profiles[email]["activated"] = True

    path.write_text(json.dumps(profiles, indent=2))

    subprocess.run(
        ["cp", str(ssh_dir / email / "id_ed25519"), str(ssh_dir / "id_ed25519")]
    )
    subprocess.run(
        ["cp", str(ssh_dir / email / "id_ed25519.pub"), str(ssh_dir / "id_ed25519.pub")]
    )
    subprocess.run(["git", "config", "--global", "user.name", profiles[email]["name"]])
    subprocess.run(["git", "config", "--global", "user.email", email])


def generate_ssh_key(email: str, ssh_dir=SSH_DIR):
    path = ssh_dir / email / "id_ed25519"
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ssh-keygen", "-t", "ed25519", "-N", "", "-C", email, "-f", str(path), "-q"]
    )


def cli():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("email", nargs="?", help="Email address for the Git profile")
    parser.add_argument("name", nargs="?", help="Name for the Git profile")
    parser.add_argument(
        "--delete", "-d", action="store_true", help="Delete the Git profile"
    )
    parser.add_argument(
        "--update-name", "-u", action="store_true", help="Update the Git profile name"
    )
    args = parser.parse_args()

    specified_action: Literal["delete", "update_name", "auto"]
    if args.delete and args.update_name:
        raise ValueError("Cannot delete and update profile at the same time")
    elif args.delete:
        specified_action = "delete"
    elif args.update_name:
        specified_action = "update_name"
    else:
        specified_action = "auto"

    action: Literal["delete", "update_name", "show", "activate", "create"]
    if specified_action == "auto":
        if not args.email:
            action = "show"
        elif not args.name:
            action = "activate"
        else:
            action = "create"
    else:
        action = specified_action

    email, name = args.email, args.name

    match action:
        case "delete":
            if not email:
                return print("Email is required for delete action")
            if not email in read_profiles():
                return print(f"Profile {email} not found")

            delete_profile(email)
            print(f"Deleted profile {email}")

        case "update_name":
            if not email:
                return print("Email is required for update_name action")
            if not name:
                return print("Name is required for update_name action")
            if not email in read_profiles():
                return print(f"Profile {email} not found")

            update_profile(email, name)
            print(f"Updated profile {email} as {name} <{email}>")

        case "show":
            profiles = read_profiles()
            if not profiles:
                return print("No profiles")

            for email, profile in profiles.items():
                if profile["activated"]:
                    print(f"{profile['name']} <{email}>")

        case "activate":
            if not email:
                return print("Email is required for activate action")

            if email in read_profiles():
                activate_profile(email)
            else:
                email: str
                for _email, profile in read_profiles().items():
                    if email in _email:
                        email = _email
                        activate_profile(email)
                        print(f"{profile['name']} <{email}>")
                        break
                else:
                    return print(f"Profile {email} not found")

        case "create":
            if not email:
                return print("Email is required for create action")
            if not name:
                return print("Name is required for create action")

            create_profile(email, name)
            print(f"Created profile {name} <{email}>")
