require('./database').migrate().catch((error) => { console.error(error); process.exit(1); });
