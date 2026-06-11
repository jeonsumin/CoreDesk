module.exports = {
  apps: [
    {
      name: "next-app",
      cwd: "/home/docker/CoreDesk",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: 3000
      }
    }
  ]
};
