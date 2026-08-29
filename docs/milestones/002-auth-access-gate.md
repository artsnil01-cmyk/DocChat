# Milestone 002: Auth Access Gate

## Goal

Make the shared-account access gate usable from API routes and the login page.

## Steps

- [x] Implement login route.
- [x] Implement logout route.
- [x] Reuse valid workspace cookie during login.
- [x] Create new workspace ID when missing or invalid.
- [x] Set secure auth cookie.
- [x] Set signed persistent workspace cookie.
- [x] Clear auth cookie on logout.
- [x] Preserve workspace cookie on logout.
- [ ] Protect backend route placeholders with auth guard.
- [ ] Add login page UI from provided design.
- [ ] Wire login form submission.
- [ ] Add authenticated app redirect behavior.

## Validation

- [ ] Login succeeds with seeded account.
- [ ] Invalid credentials fail.
- [ ] Logout revokes the active session.
- [ ] Workspace cookie survives logout.
- [ ] Protected APIs reject unauthenticated requests.
