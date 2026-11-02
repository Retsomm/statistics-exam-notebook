import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {connectFirestoreEmulator,doc,getDoc,getFirestore,serverTimestamp,setDoc,terminate} from 'firebase/firestore';

const address=process.env.FIRESTORE_EMULATOR_HOST;
if(!address)throw new Error('Run this test through the Firestore emulator.');
const separator=address.lastIndexOf(':');
const host=address.slice(0,separator),port=Number(address.slice(separator+1));
const projectId='demo-statistics-rules';
const uid='rules-test-owner';
const app=initializeApp({projectId},'owner');
const db=getFirestore(app);
connectFirestoreEmulator(db,host,port,{mockUserToken:{sub:uid,email_verified:true,firebase:{sign_in_provider:'google.com'}}});
const question={
 wrong:{active:true,time:'2026-10-29T02:24:28.538Z',answer:'A'},
 record:{answer:'A',correct:false,attempts:1,time:'2026-10-29T02:24:28.538Z'},
 history:[{id:'115-3d-7',answer:'A',correct:false,time:'2026-10-29T02:24:28.538Z'}],
 applied:['165c302e-3ae7-4626-92db-4d40a0fe7580'],revision:1,updatedAt:serverTimestamp(),
};
const denied=async promise=>assert.rejects(promise,error=>error.code==='permission-denied');
try{
 const ownQuestion=doc(db,'users',uid,'questions','115-3d-7');
 await setDoc(ownQuestion,question);
 assert.equal((await getDoc(ownQuestion)).data().record.answer,'A');
 await setDoc(doc(db,'users',uid,'questions','115-2s-1'),{...question,updatedAt:serverTimestamp()});
 await denied(setDoc(doc(db,'users','another-user','questions','115-3d-7'),{...question,updatedAt:serverTimestamp()}));
 await denied(setDoc(doc(db,'users',uid,'questions','invalid-question'),{...question,updatedAt:serverTimestamp()}));
 await denied(setDoc(doc(db,'users',uid,'questions','115-3d-8'),{...question,unexpected:true,updatedAt:serverTimestamp()}));
 const session=doc(db,'users',uid,'study','session');
 await setDoc(session,{sessionJSON:'null',applied:[],revision:1,updatedAt:serverTimestamp()});
 assert.equal((await getDoc(session)).data().sessionJSON,'null');
 console.log('Firestore rules accept the reported write and reject unauthorized writes.');
}finally{
 await terminate(db);
 await deleteApp(app);
}
