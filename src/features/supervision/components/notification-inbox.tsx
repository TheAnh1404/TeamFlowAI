"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { notificationListSchema, notificationSchema, type Notification } from "../contracts";

export function NotificationInbox() {
  const [notices,setNotices]=useState<Notification[]>([]),[error,setError]=useState("");
  const [busy,setBusy]=useState<string|null>(null);
  const generation=useRef(0);
  const load=useCallback(async(signal?:AbortSignal)=>{
    const stamp=generation.current;
    try { const result=await apiFetch("/api/notifications",notificationListSchema,{signal,cache:"no-store"});if(!signal?.aborted&&stamp===generation.current){setNotices(result.data);setError("");} }
    catch(e){if(signal?.aborted||stamp!==generation.current)return;if(e instanceof ApiClientError&&e.status===401){setNotices([]);setError("");}else setError("Chưa tải được thông báo. Thử tải lại khi kết nối sẵn sàng.");}
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    const stamp=generation.current;
    apiFetch("/api/notifications",notificationListSchema,{signal:controller.signal,cache:"no-store"})
      .then(result=>{if(!controller.signal.aborted&&stamp===generation.current){setNotices(result.data);setError("");}})
      .catch(e=>{if(controller.signal.aborted||stamp!==generation.current)return;if(e instanceof ApiClientError&&e.status===401){setNotices([]);setError("");}else setError("Chưa tải được thông báo. Thử tải lại khi kết nối sẵn sàng.");});
    const refresh=()=>{void load(controller.signal);};
    const sessionChanged=()=>{generation.current++;setNotices([]);refresh();};
    const timer=setInterval(refresh,30000);
    window.addEventListener("focus",refresh);window.addEventListener("teamflow:session-changed",sessionChanged);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("teamflow:session-changed",sessionChanged);};
  },[load]);
  async function read(id:string){setBusy(id);try{const result=await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`,notificationSchema,{method:"POST"});setNotices(ns=>ns.map(n=>n.id===id?result.data:n));}catch{setError("Chưa ghi nhận đã đọc. Bạn có thể thử lại.");}finally{setBusy(null);}}
  const unread=notices.filter(n=>!n.readAt&&!n.resolvedAt).length;
  return <details className="tf-inbox"><summary aria-label={`Thông báo, ${unread} chưa đọc`}>Thông báo <span aria-live="polite">({unread})</span></summary><div className="tf-inbox-panel"><div className="tf-row"><h2>Thông báo dự án</h2><button className="tf-button secondary" type="button" onClick={()=>void load()}>Tải lại</button></div>{error&&<p role="alert">{error}</p>}{!error&&!notices.length&&<p>Chưa có thông báo. Cảnh báo sẽ xuất hiện khi dự án cần rà soát tiến độ.</p>}<ul>{notices.map(n=><li key={n.id}><strong>{n.title}</strong>{n.resolvedAt&&<span className="tf-badge">Đã cải thiện tiến độ</span>}<p>{n.message}</p><p className="tf-muted">Ghi nhận: {new Date(n.snapshot.asOf).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</p><div className="tf-actions"><Link href={`/app/projects/${encodeURIComponent(n.projectId)}/supervision`}>Xem timeline dự án →</Link>{!n.readAt&&<button className="tf-button secondary" type="button" disabled={busy===n.id} onClick={()=>void read(n.id)}>Đánh dấu đã đọc</button>}</div></li>)}</ul></div></details>;
}
