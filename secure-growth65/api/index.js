'use strict';
const {PostgresStore}=require('../lib/store.cjs');const{Service}=require('../lib/service.cjs');const{handler,headers}=require('../lib/http.cjs');
let app;
module.exports=async(req,res)=>{try{if(!app){if(!process.env.APP_ORIGIN||!process.env.SECURITY_KEY||!process.env.DATABASE_URL)throw Error('Setup required');const store=new PostgresStore(process.env.DATABASE_URL);app=handler(new Service(store,{securityKey:process.env.SECURITY_KEY}),{origin:process.env.APP_ORIGIN,secure:true})}return await app(req,res)}catch{headers(res);res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'SETUP_REQUIRED',message:'Защищённая база ещё не настроена. Данные старой версии не изменялись.'}))}};
