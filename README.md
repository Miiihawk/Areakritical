## README

Workflow reference for CS401 Final project

## How to use this document

- Clone or Fork this project as your basis for the final project.
- Delete `.gitkeep` files inside the `docs` and `apps` folder.
- `.opencode` folder is dedicated to OpenCode.
- `docs` is primarily for files you need to use to give context with AI.
- `apps` is the root folder of the application, all source code here.

## What to do next

- After cloning this repo, open the project folder and delete .git folder
- Open a terminal target the project location and initialize git by typeing `git init`
- Go to your github and copy the url of your repository.
- Go to the terminal and do the following:
  - type `git branch -M finals` to set your branch name
  - type `git remote add origin <url of your repo>` this is to set the remote repository
  - type `git add .` stage all files
  - type `git commit -m "your message"` commit with your message
  - type `git push -u origin finals` to push your local finals branch to remote repository
- This is now your working environment so you can proceed to complete your project

## Need to install before to proceed

- Install OpenCode by using npm `npm install -g opencode-ai`
- Check version of OpenCode - `opencode --version`
- Install uv:
  - for windows - `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
  - for MacOS - `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Check version of uv to see if successfully installed `uv --version`
- Install Speckit by using uv - `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z`
- Replace X.Y.Z with the latest version of speckit as of the moment the latest version is 0.12.16
- Check version of speckit to see if installed - `specify --version`

## Project Scaffolding

- Open terminal and target your project and type this command `specify init . --integration opencode`
- This will ask what scripting language to choose:
  - if you're using windows choose (ps) powershell
  - if you're on linux or macos choose (bs) bash
