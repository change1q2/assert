function loadAuth() {
  return {
    token: "",
    currentUser: "",
    users: [],
  };
}

function saveAuth() {
  clearPersistedAuth();
}

function isAuthenticated() {
  return Boolean(auth.currentUser && auth.token);
}

function syncUserFromAuth() {
  const user = auth.users.find((item) => item.account === auth.currentUser);
  if (!user) return;
  state.user = { ...state.user, ...user.profile, account: user.account };
  filters.currency = state.user.currency;
  saveState();
}

function saveProfileToAuth() {
  const user = auth.users.find((item) => item.account === auth.currentUser);
  if (!user) return;
  user.profile = { ...state.user };
  saveAuth();
}
