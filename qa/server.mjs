import { createServer } from "vite";
import { resolve } from "node:path";
const configs = [["finance",".",4183]];
for (const [service,repo,port] of configs) {
  const root=resolve(repo);
  process.chdir(root);
  const server=await createServer({root, configFile:resolve(root,"vite.config.ts"),
    define:service==="office" ? {"import.meta.env.VITE_HOIKU_DEMO_MODE":"\"true\""} : {},
    server:{port,host:"127.0.0.1",strictPort:true},
    plugins:[{name:"ui-fixtures",enforce:"pre",resolveId(id){
      if(service==="market" && (/NurseryContext$|useCreatedWebsites$/.test(id) || id==="@/lib/supabase")) return resolve(root,"qa/session.ts");
      if(service==="market" && /UserMenu$/.test(id)) return resolve(root,"qa/account.tsx");
      if(service==="finance" && /FinanceSession$/.test(id)) return resolve(root,"qa/session.ts");
      if(service==="finance" && /FinanceAccountMenu$/.test(id)) return resolve(root,"qa/account.tsx");
    },configureServer(server){server.middlewares.use((req,res,next)=>{
      if(req.url && !req.url.includes(".") && !req.url.includes("@") && !req.url.includes("node_modules") && !req.url.includes("src/")) req.url=`/${service}/qa/index.html`;
      next();
    });}}]
  }); await server.listen(); console.log(`${service}: http://127.0.0.1:${port}/${service}`);
}
