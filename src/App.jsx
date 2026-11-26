
import React,{useEffect,useState}from'react';
import{createClient}from'@supabase/supabase-js';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase=url&&key?createClient(url,key):null;

export default function App(){
 const[session,setSession]=useState(null);
 const[profile,setProfile]=useState(null);
 const[suppliers,setSuppliers]=useState([]);
 const[defects,setDefects]=useState([]);
 const[plans,setPlans]=useState({});
 const[msg,setMsg]=useState('');
 const[loading,setLoading]=useState(true);
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');

 async function load(){
  if(!supabase){setLoading(false);return;}
  const{data:{session:s}}=await supabase.auth.getSession();
  setSession(s);
  if(!s){setLoading(false);return;}
  const{data:p}=await supabase.from('profiles').select('*').eq('id',s.user.id).single();
  setProfile(p);
  if(p?.role==='admin'){
   const{data:sp}=await supabase.from('suppliers').select('*');
   setSuppliers(sp||[]);
  }
  const{data:d,error}=await supabase.from('defects').select('*,suppliers(name)').order('created_at',{ascending:false});
  if(error)setMsg(error.message);
  setDefects(d||[]);
  const{data:a}=await supabase.from('action_plans').select('*');
  setPlans(Object.fromEntries((a||[]).map(x=>[x.defect_id,x])));
  setLoading(false);
 }

 useEffect(()=>{
  load();
  if(!supabase)return;
  const{data:{subscription}}=supabase.auth.onAuthStateChange(()=>load());
  return()=>subscription.unsubscribe();
 },[]);

 useEffect(()=>{
  if(!supabase||!session)return;
  const channel=supabase.channel('live')
   .on('postgres_changes',{event:'*',schema:'public',table:'defects'},()=>load())
   .on('postgres_changes',{event:'*',schema:'public',table:'action_plans'},()=>load())
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[session]);

 async function login(e){
  e.preventDefault();
  const{error}=await supabase.auth.signInWithPassword({email,password});
  setMsg(error?error.message:'');
  if(!error)load();
 }

 async function signup(e){
  e.preventDefault();
  const{error}=await supabase.auth.signUp({email,password});
  setMsg(error?error.message:'Check your email for verification.');
 }

 async function logout(){
  await supabase.auth.signOut();
  setSession(null);setProfile(null);
 }

 async function addSupplier(e){
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const{error}=await supabase.from('suppliers').insert({
   name:f.get('name'),email:f.get('email')
  });
  setMsg(error?error.message:'Supplier added');
  e.currentTarget.reset();load();
 }

 async function addDefect(e){
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const{error}=await supabase.from('defects').insert({
   part_no:f.get('part_no'),
   defect:f.get('defect'),
   defect_date:f.get('date'),
   supplier_id:f.get('supplier_id')
  });
  setMsg(error?error.message:'Defect added');
  e.currentTarget.reset();load();
 }

 async function saveDefect(d){
  const{error}=await supabase.from('defects').update({
   part_no:d.part_no,
   defect:d.defect,
   defect_date:d.defect_date,
   supplier_id:d.supplier_id
  }).eq('id',d.id);
  setMsg(error?.message||'Saved');
  load();
 }

 async function deleteDefect(id){
  if(!confirm('Delete defect?'))return;
  const{error}=await supabase.from('defects').delete().eq('id',id);
  setMsg(error?.message||'Deleted');
  load();
 }

 async function savePlan(e,d){
  e.preventDefault();
  const f=new FormData(e.currentTarget);
  const{error}=await supabase.from('action_plans').upsert({
   defect_id:d.id,
   root_cause:f.get('root_cause'),
   corrective_action:f.get('corrective_action'),
   preventive_action:f.get('preventive_action'),
   target_date:f.get('target_date'),
   submitted:true
  },{onConflict:'defect_id'});
  setMsg(error?.message||'Action plan submitted');
  load();
 }

 if(loading)return <main><h1>SYIPL Supplier Defect Summary</h1>Loading...</main>;

 if(!supabase)return <main><h1>SYIPL Supplier Defect Summary</h1><p>Supabase setup required.</p></main>;

 if(!session)return <main className="auth">
  <h1>SYIPL Supplier Defect Summary</h1>
  <form onSubmit={login}>
   <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
   <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
   <button>Login</button>
  </form>
  <form onSubmit={signup}>
   <h3>Supplier Register</h3>
   <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
   <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
   <button>Register</button>
  </form>
  <p>{msg}</p>
 </main>;

 if(!profile)return <main>
  <h1>Profile not linked</h1>
  <p>Ask Admin to create your profile in database.</p>
  <button onClick={logout}>Logout</button>
 </main>;

 return <main>
  <header>
   <div>
    <h1>SYIPL Supplier Defect Summary</h1>
    <p>{profile.role==='admin'?'Owner Dashboard':'Supplier Dashboard'}</p>
   </div>
   <button onClick={logout}>Logout</button>
  </header>

  {msg&&<p>{msg}</p>}

  {profile.role==='admin'?<>
   <section className="stats">
    <div>Total Defects<strong>{defects.length}</strong></div>
    <div>Pending<strong>{defects.filter(d=>!plans[d.id]?.submitted).length}</strong></div>
    <div>Submitted<strong>{defects.filter(d=>plans[d.id]?.submitted).length}</strong></div>
   </section>

   <section className="panel">
    <h2>Add Supplier</h2>
    <form className="gridform" onSubmit={addSupplier}>
     <input name="name" placeholder="Supplier Name" required/>
     <input name="email" type="email" placeholder="Supplier Email" required/>
     <button>Add Supplier</button>
    </form>
   </section>

   <section className="panel">
    <h2>Add Defect</h2>
    <form className="gridform" onSubmit={addDefect}>
     <input name="part_no" placeholder="Part No." required/>
     <input name="defect" placeholder="Defect" required/>
     <input name="date" type="date" required/>
     <select name="supplier_id" required>
      <option value="">Select Supplier</option>
      {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
     </select>
     <button>Add Defect</button>
    </form>
   </section>

   <section className="panel">
    <h2>All Defects</h2>
    <div className="tablewrap">
     <table>
      <thead><tr>
       <th>Part No.</th><th>Defect</th><th>Date</th><th>Supplier</th><th>Plan</th><th>Action</th>
      </tr></thead>
      <tbody>
       {defects.map(d=><tr key={d.id}>
        <td><input value={d.part_no||''} onChange={e=>setDefects(ds=>ds.map(x=>x.id===d.id?{...x,part_no:e.target.value}:x))}/></td>
        <td><input value={d.defect||''} onChange={e=>setDefects(ds=>ds.map(x=>x.id===d.id?{...x,defect:e.target.value}:x))}/></td>
        <td><input type="date" value={d.defect_date||''} onChange={e=>setDefects(ds=>ds.map(x=>x.id===d.id?{...x,defect_date:e.target.value}:x))}/></td>
        <td><select value={d.supplier_id||''} onChange={e=>setDefects(ds=>ds.map(x=>x.id===d.id?{...x,supplier_id:e.target.value}:x))}>
         <option value="">Unassigned</option>
         {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select></td>
        <td>{plans[d.id]?.submitted?'Submitted':'Pending'}</td>
        <td><button onClick={()=>saveDefect(d)}>Save</button><button onClick={()=>deleteDefect(d.id)}>Delete</button></td>
       </tr>)}
      </tbody>
     </table>
    </div>
   </section>
  </>:<section className="panel">
   <h2>Your Assigned Defects</h2>
   <div className="tablewrap">
    <table><thead><tr><th>Part No.</th><th>Defect</th><th>Date</th><th>Status</th><th>Action Plan</th></tr></thead>
     <tbody>{defects.map(d=><tr key={d.id}>
      <td>{d.part_no}</td><td>{d.defect}</td><td>{d.defect_date}</td>
      <td>{plans[d.id]?.submitted?'Submitted':'Pending'}</td>
      <td><form className="planform" onSubmit={e=>savePlan(e,d)}>
       <textarea name="root_cause" placeholder="Root Cause" required/>
       <textarea name="corrective_action" placeholder="Corrective Action" required/>
       <textarea name="preventive_action" placeholder="Preventive Action" required/>
       <input name="target_date" type="date" required/>
       <button>Submit Action Plan</button>
      </form></td>
     </tr>)}</tbody>
    </table>
   </div>
  </section>}
 </main>;
}
