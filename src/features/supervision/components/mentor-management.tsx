"use client";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { userSchema, type User } from "@/contracts";
import { apiFetch } from "@/lib/api-client";
import { mentorGrantSchema, mentorListSchema } from "../contracts";
import { Alert, Button } from "@/components/ui/primitives";

export function MentorManagement({projectId,memberUserIds}:{projectId:string;memberUserIds:string[]}) {
  const [mentors,setMentors]=useState<z.infer<typeof mentorListSchema>>([]),[users,setUsers]=useState<User[]>([]);
  const [selected,setSelected]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  const url=`/api/projects/${encodeURIComponent(projectId)}/mentors`;
  const load=useCallback(async()=>{
    const [grants,people]=await Promise.all([apiFetch(url,mentorListSchema),apiFetch("/api/users",z.array(userSchema))]);
    setMentors(grants.data);setUsers(people.data);
  },[url]);
  useEffect(()=>{
    let active=true;
    Promise.all([apiFetch(url,mentorListSchema),apiFetch("/api/users",z.array(userSchema))])
      .then(([grants,people])=>{if(active){setMentors(grants.data);setUsers(people.data);}})
      .catch(()=>{if(active)setError("Chưa tải được quyền xem của mentor.");});
    return()=>{active=false;};
  },[url]);
  async function change(userId:string,method:"POST"|"DELETE"){
    setBusy(true);setError("");setNotice("");
    try { if(method==="DELETE"&&!window.confirm("Thu hồi quyền xem và thông báo của mentor trong dự án này?"))return;
      const init={method,headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})};
      if(method==="POST")await apiFetch(url,mentorGrantSchema,init);
      else await apiFetch(url,z.object({revoked:z.boolean()}),init);
      await load();setSelected("");setNotice(method==="POST"?"Đã cấp quyền xem dự án cho mentor.":"Đã thu hồi quyền xem của mentor.");
    }catch(e){setError(e instanceof Error?e.message:"Chưa thay đổi được quyền xem.");}finally{setBusy(false);}
  }
  const available=users.filter(u=>!memberUserIds.includes(u.id)&&!mentors.some(m=>m.user.id===u.id));
  return <details className="tf-card"><summary className="tf-panel-summary">Mentor đồng hành · {mentors.length} người có quyền xem</summary><p>Mentor được xem timeline, tiến độ và nhận cảnh báo của dự án. Quyền này không cho phép thay kế hoạch, giao việc hoặc nghiệm thu.</p>{error&&<Alert>{error}</Alert>}{notice&&<p role="status">{notice}</p>}<label>Chọn tài khoản mentor<select aria-label="Chọn tài khoản mentor" value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy}><option value="">Chọn tài khoản có sẵn</option>{available.map(u=><option key={u.id} value={u.id}>{u.displayName}</option>)}</select></label><Button type="button" disabled={busy||!selected} onClick={()=>void change(selected,"POST")}>Cấp quyền xem</Button>{mentors.length>0&&<ul>{mentors.map(({user})=><li key={user.id} className="tf-row"><span>{user.displayName}</span><Button type="button" className="secondary" disabled={busy} onClick={()=>void change(user.id,"DELETE")}>Thu hồi quyền của {user.displayName}</Button></li>)}</ul>}</details>;
}
