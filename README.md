# GitHub Pages Calculator Site

This folder is ready to be used as a separate GitHub Pages repository for:

`https://calc.xiao-li-locksmith.com`

## Files

- `index.html`: the calculator web page
- `CNAME`: tells GitHub Pages to use `calc.xiao-li-locksmith.com`
- `.nojekyll`: disables Jekyll processing so the static file is served as-is

## How to publish

1. Create a new GitHub repository.
2. Copy the contents of this folder into that repository root.
3. Push to GitHub.
4. In GitHub:
   - go to `Settings` -> `Pages`
   - set `Source` to `Deploy from a branch`
   - choose branch `main`
   - choose folder `/ (root)`
5. In Cloudflare DNS, add a `CNAME` record:
   - `Name`: `calc`
   - `Target`: `YOUR_GITHUB_USERNAME.github.io`
6. Wait for GitHub Pages and Cloudflare to finish updating.

## Notes

- This setup is for a separate subdomain site.
- It does not change your main site at `https://xiao-li-locksmith.com/`.
- If GitHub Pages shows the custom domain field, it should already pick up `calc.xiao-li-locksmith.com` from the `CNAME` file.
