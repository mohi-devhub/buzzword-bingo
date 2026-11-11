<!-- Gives the owner the exact manual first-push and GitHub Pages release steps.
Leaves repository creation, settings, and public deployment in the owner's hands. -->

# First public push and Pages setup

These are instructions only. No repository creation, push, settings change, workflow dispatch, or public deployment was performed by the coding agent.

1. Open [GitHub’s new repository form](https://github.com/new). Choose owner **mohi-devhub**, name **buzzword-bingo**, and visibility **Public**. Leave README, .gitignore, and license initialization off, then select **Create repository**. If the intended empty public repository already exists, reuse it. [GitHub’s creation instructions](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository).

2. In your terminal, push only the cleaned `main` branch:

   ```sh
   cd /Users/mohith/Projects/buzzboard
   npm run verify:public
   git status --short
   git remote add origin https://github.com/mohi-devhub/buzzword-bingo.git
   git push -u origin main
   ```

   `git status --short` should be empty. There is currently no configured remote. If you already added `origin`, inspect it with `git remote -v`; use `git remote set-url origin https://github.com/mohi-devhub/buzzword-bingo.git` instead of `git remote add`. Do not push private bundles or backup branches, and do not force-push over an existing repository with unrelated work.

3. Verify the public opt-out template before enabling deployment:

   ```sh
   curl --fail --silent --show-error --output /dev/null \
     https://github.com/mohi-devhub/buzzword-bingo
   curl --fail --silent --show-error --output /dev/null \
     https://raw.githubusercontent.com/mohi-devhub/buzzword-bingo/main/.github/ISSUE_TEMPLATE/company-opt-out.yml
   ```

   Both commands must succeed. While signed into GitHub, open [the configured opt-out URL](https://github.com/mohi-devhub/buzzword-bingo/issues/new?template=company-opt-out.yml). Confirm that it shows **Company opt-out**, the company-name and public-homepage fields, and the one-week removal note. Do not submit a test issue. A logged-out redirect to sign-in is normal; sign in to verify the actual form. Under **Settings → General → Features**, keep **Issues** enabled.

4. Open the repository’s **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**. [GitHub’s Pages source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

5. Open **Settings → Secrets and variables → Actions → Variables → New repository variable**. Add:

   | Name | Value |
   | --- | --- |
   | `AUTOMATION_ENABLED` | `false` |
   | `DEPLOY_ENABLED` | `true` |

   These are non-secret configuration variables. Do **not** add a Context.dev or OpenAI secret. The workflow already sets `BINGO_SITE_URL=https://mohi-devhub.github.io/buzzword-bingo/` and `BINGO_BASE=/buzzword-bingo/`. [GitHub’s variable instructions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables).

6. When you are ready to publish, open **Actions → GitHub Pages → Run workflow**, select **main**, and click **Run workflow**. Wait for **build** and **deploy** to succeed. If GitHub requests an environment approval, approve it yourself. [GitHub’s manual workflow instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

7. Open [the public site](https://mohi-devhub.github.io/buzzword-bingo/) and verify the comparison, a company page, its share image, and **Opt out a company**. Crawling and re-scoring stay manual and local; `AUTOMATION_ENABLED` remains false.
