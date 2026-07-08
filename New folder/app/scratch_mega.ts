import { Storage } from 'megajs';

async function testMega() {
  console.log("Connecting to Mega...");
  const storage = new Storage({
    email: 'gurumefia@gmail.com',
    password: 'Mcsg@r#45(<>)', // Using pass from MEGA auto connection logs or I can't guess. 
    autologin: true,
    autoload: true
  });

  await new Promise<void>((resolve, reject) => {
    storage.once('ready', () => resolve());
    storage.on('error', (err: any) => reject(err));
  });
  
  console.log("Connected. Reloading state...");
  await storage.reload();
  
  const root = storage.root;
  const children = root.children || [];
  const existing = children.find(f => f.name === 'POS Backups' && f.directory);
  
  if (!existing) {
    console.log("Folder 'POS Backups' not found!");
    return;
  }
  
  console.log(`Folder POS Backups found. Children count: ${existing.children?.length}`);
  if (existing.children) {
    for (let f of existing.children) {
      console.log(`- file: ${f.name}, size: ${f.size}, directory: ${f.directory}`);
    }
  }
  storage.close();
}

testMega().catch(console.error);
