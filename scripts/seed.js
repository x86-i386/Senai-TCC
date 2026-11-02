require('./database').seed().catch((error) => { console.error(error); process.exit(1); });
