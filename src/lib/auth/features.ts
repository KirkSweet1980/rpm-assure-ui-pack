/**
 * Feature flags for surfaces temporarily deferred.
 * Flip to true when re-enabling.
 */
export const USER_ACCOUNTS_ENABLED = true;
export const USER_PROFILE_ENABLED = true;
export const TWO_FACTOR_ENABLED = true;
/** Top-nav Configuration /settings menu */
export const SETTINGS_MENU_ENABLED = true;

/** Self-register + Users admin + profile/2FA nav */
export const STAFF_ACCOUNT_UI_ENABLED =
  USER_ACCOUNTS_ENABLED || USER_PROFILE_ENABLED || TWO_FACTOR_ENABLED;
