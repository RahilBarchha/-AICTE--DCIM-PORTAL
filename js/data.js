const mockServers = [
  { id: 1, name: "Server-01", ip: "192.168.1.10", status: "Online", os: "Linux", cpu: 45, ram: 60 },
  { id: 2, name: "Server-02", ip: "192.168.1.11", status: "Offline", os: "Windows", cpu: 0, ram: 0 }
];

function getServers() {
  return mockServers;
}
