"use client";
import {useEffect,useRef,useState} from "react";
import {z} from "zod";
import {sourceRefSchema,type SourceRef} from "@/contracts/report";
import {apiFetch} from "@/lib/api-client";
const sourceSchema=z.object({sourceRef:sourceRefSchema,reportAsOf:z.string(),currentState:z.boolean(),record:z.record(z.string(),z.unknown())});
export function ReportSourcesDrawer({sourceRef,reportId,onClose}:{sourceRef:SourceRef|null;reportId?:string;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [loaded,setLoaded]=useState<{key:string;data:z.infer<typeof sourceSchema>}|null>(null),[error,setError]=useState<{key:string;message:string}|null>(null);
  const key=sourceRef&&reportId?`${reportId}:${sourceRef.entity}:${sourceRef.id}`:"";
  useEffect(()=>{
    if(!sourceRef||!reportId||!key)return;
    const controller=new AbortController();dialog.current?.showModal();
    apiFetch(`/api/reports/${encodeURIComponent(reportId)}/source?entity=${encodeURIComponent(sourceRef.entity)}&id=${encodeURIComponent(sourceRef.id)}`,sourceSchema,{signal:controller.signal})
      .then(result=>{if(!controller.signal.aborted){setLoaded({key,data:result.data});setError(null);}})
      .catch(e=>{if(!controller.signal.aborted)setError({key,message:e instanceof Error?e.message:"Chưa tải được nguồn dẫn chứng."});});
    return()=>controller.abort();
  },[sourceRef,reportId,key]);
  if(!sourceRef||!reportId)return null;
  const data=loaded?.key===key?loaded.data:null;
  return <dialog ref={dialog} className="tf-source-dialog" aria-labelledby="source-title" onCancel={e=>{e.preventDefault();onClose();}}><div className="tf-row"><h2 id="source-title">Nguồn dẫn chứng · {sourceRef.entity}</h2><button className="tf-button secondary" autoFocus type="button" onClick={onClose}>Đóng</button></div>{error?.key===key?<p role="alert">{error.message}</p>:data?<><p>{data.currentState?"Đây là trạng thái công việc hiện tại; số liệu báo cáo vẫn giữ nguyên tại mốc đã lưu.":"Đây là bản ghi nguồn đã lưu, được tham chiếu trong báo cáo."}</p><pre>{JSON.stringify(data.record,null,2)}</pre></>:<p role="status">Đang tải nguồn dẫn chứng…</p>}</dialog>;
}
