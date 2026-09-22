import {rm,mkdir,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const f of ['index.html','about','collections','contact','insights','service','start-project','admin','pages.css','theme.css','site.js','cms.js','cms-defaults.json','hero-v2.png','about-v2.png','collection-v2.png','hero.png'])await cp(f,`dist/${f}`,{recursive:true});
