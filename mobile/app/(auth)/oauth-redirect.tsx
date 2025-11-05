// Duplicate route group file that maps to the same path as app/oauth-redirect.tsx.
// To avoid conflicting implementations, re-export the root component.
import Redirect from '../oauth-redirect';
export default Redirect;