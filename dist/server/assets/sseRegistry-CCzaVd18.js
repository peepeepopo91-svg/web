function getClients() {
  if (!globalThis.__miningSSEClients) {
    globalThis.__miningSSEClients = /* @__PURE__ */ new Set();
  }
  return globalThis.__miningSSEClients;
}
function broadcastMiningUpdate() {
  const msg = "event: mining_updated\ndata: 1\n\n";
  const clients = getClients();
  for (const write of clients) {
    try {
      write(msg);
    } catch {
      clients.delete(write);
    }
  }
}
function broadcastShopUpdate() {
  const msg = "event: shop_updated\ndata: 1\n\n";
  const clients = getClients();
  for (const write of clients) {
    try {
      write(msg);
    } catch {
      clients.delete(write);
    }
  }
}
function broadcastTournamentUpdate() {
  const msg = "event: tournament_updated\ndata: 1\n\n";
  const clients = getClients();
  for (const write of clients) {
    try {
      write(msg);
    } catch {
      clients.delete(write);
    }
  }
}
export {
  broadcastMiningUpdate as a,
  broadcastTournamentUpdate as b,
  broadcastShopUpdate as c
};
