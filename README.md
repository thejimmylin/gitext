# How I set up my Git, SSH key that work with multiple Github accounts

SSH key is the best way to work with Github private repositories

## Set up basic Git global config

```bash
git config --global user.email b00502013@gmail.com
git config --global user.name "Jimmy Lin"
```

## Use SSH key to sign commit

```bash
ssh-keygen -t ed25519 -C "b00502013@gmail.com"
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

## Use VSCode to edit commit message

```bash
git config --global core.editor "code --wait"
```

## View and edit Git config

```bash
git config --global --edit
```

Usually it would be something like this:

```jsx
[core]
	editor = code --wait
[user]
	name = Jimmy Lin
	email = jimmy@fscape.xyz
	signingkey = /Users/jimmy/.ssh/id_ed25519.pub
[gpg]
	format = ssh
[commit]
	gpgsign = true
```

## Have multiple SSH key pairs directories in `~/.ssh`

```bash
~/.ssh/id_ed25519
~/.ssh/id_ed25519.pub
~/.ssh/foo/id_ed25519
~/.ssh/foo/id_ed25519.pub
~/.ssh/bar/id_ed25519
~/.ssh/bar/id_ed25519.pub
```

# When I switch account, what would I do?

1. Set up basic Git global config again

   ```bash
   git config --global user.name "Company A Jimmy"
   git config --global user.email jimmy@company-a.com
   ```

2. Deactivate a SSH key pair

   ```bash
   rm ~/.ssh/id_ed25519
   rm ~/.ssh/id_ed25519.pub
   ```

3. Activate a SSH key pair

   ```bash
   cp ~/.ssh/backup/id_ed25519 ~/.ssh/id_ed25519
   cp ~/.ssh/backup/id_ed25519 ~/.ssh/id_ed25519.pub
   ```
