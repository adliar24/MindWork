# Auto Git Push Rule

Always commit and push any changes made to this repository to GitHub automatically.

- **Repository**: `https://github.com/adliar24/MindWork`
- **Branch**: `main`
- **Action**: Whenever file edits or code changes are completed, stage changes with `git add .`, commit with an appropriate message, and push directly with `git push origin main`.
- **Confidentiality**: Never commit `.env` or sensitive credentials. The Git remote origin is already pre-configured with the personal access token in `.git/config`.
