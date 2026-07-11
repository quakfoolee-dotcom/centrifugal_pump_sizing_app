const major = Number(process.versions.node.split(".")[0]);

if (major !== 24) {
  console.error(`Desktop packaging requires Node.js 24 LTS; current runtime is ${process.version}.`);
  console.error("Use Node 24 locally or let the Windows GitHub Actions desktop job build the artifacts.");
  process.exit(1);
}
